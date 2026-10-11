# 03A · Backend: Operator 1 (AI & Orchestration)

> Split of `03_BACKEND.md` between two backend operators.
> **Operator 1 owns everything that talks to the LLM and everything that assembles the final report.**
> **Operator 2** (see `03B_BACKEND_OPERATOR2_DATA_FINANCE.md`) owns data, calculators, rules, DB and infrastructure.

**Golden rule (both operators):** numbers come from code (Operator 2), words come from the LLM (Operator 1).

---

## 1. Your scope

| Area | Included |
|---|---|
| LLM layer | Client wrapper, prompt templates, JSON schemas, repair/retry, fallbacks |
| AI modules | Discovery ranking, idea normalisation, local-analysis narrative, report narrative, comparison rationale, document tailoring, advisor chat |
| Orchestration | `/report/generate` pipeline that calls Operator 2's services and merges results |
| Multilingual | Language injection into every prompt, translation helper |
| App skeleton | `main.py`, `config.py`, router registration, error handlers (create in hour 1 and push so Operator 2 can plug in) |

**Not yours:** calculators, scheme rules, CIBIL rules, datasets, DB models, caching, rate limiting, PDF (all Operator 2).

## 2. Endpoints you own

| Method | Path | What it does |
|---|---|---|
| POST | `/api/v1/discover/suggest` | Questionnaire → filtered catalogue (from Op 2) → LLM ranks top 5 with "why it suits you" |
| POST | `/api/v1/idea/normalize` | Free text/voice transcript → `{business_type, scale, products, target_customer, ambiguities[]}` |
| POST | `/api/v1/analysis/local` | Local data (from Op 2) → LLM narrative: demand, customers, competitors, opportunities, risks |
| POST | `/api/v1/report/generate` | Orchestrates the full pipeline (see §5) |
| POST | `/api/v1/compare` | 2–3 reports/ideas → comparison table data (from Op 2 numbers) + LLM best-fit rationale |
| POST | `/api/v1/documents/checklist` | Base lists (from Op 2) → LLM tailors, explains where/why |
| POST | `/api/v1/advisor/chat` | Context-aware chat, SSE streaming |
| GET | `/api/v1/i18n/{lang}` | (Optional) serves LLM-drafted UI strings |

## 3. Folder ownership

```
backend/app/
├─ main.py                  ← you (hour 1)
├─ config.py                ← you (hour 1)
├─ routers/
│   ├─ discovery.py  analysis.py  report.py
│   ├─ compare.py    documents.py advisor.py  i18n.py      ← you
├─ services/
│   ├─ discovery_service.py  analysis_service.py
│   ├─ report_service.py     compare_service.py
│   ├─ document_service.py   advisor_service.py            ← you
└─ llm/
    ├─ client.py   schemas.py   repair.py   fallbacks.py
    └─ prompts/
        ├─ system_base.md        discovery_rank.md   idea_normalize.md
        ├─ local_analysis.md     report_narrative.md compare_rationale.md
        ├─ document_tailor.md    advisor_chat.md
```

## 4. LLM layer spec

### 4.1 Client wrapper
```python
# llm/client.py
async def generate_json(prompt_name: str, variables: dict,
                        schema: type[BaseModel], lang: str) -> BaseModel: ...
async def stream_text(prompt_name: str, variables: dict, lang: str): ...   # SSE for advisor
```
- Provider-agnostic: only this file imports the Anthropic SDK. Model name from `LLM_MODEL` env var.
- `temperature=0.3`, `max_tokens` capped per module, 30s timeout.
- Retry **once** with a repair message if Pydantic validation fails; then call `fallbacks.py` (template text, no crash).
- Log latency + token usage per call.

### 4.2 System prompt rules (put in `system_base.md`)
1. Role: financial-inclusion advisor for rural India; simple, respectful language (~Class 8 reading level).
2. Write in `{lang}`; JSON keys stay English.
3. Use **only** the provided data for schemes, rates, prices and numbers. If missing → write "not available". Never guess.
4. Never promise loan approval; include the disclaimer field.
5. Output strictly the given JSON schema, no extra text.

### 4.3 Schemas (`llm/schemas.py`)
Define Pydantic models for each module's output, for example:
```python
class RiskItem(BaseModel):
    name: str; severity: Literal["low","medium","high"]; mitigation: str

class LocalAnalysisNarrative(BaseModel):
    demand_summary: str
    customer_segments: list[str]
    competitor_summary: str
    opportunities: list[str]
    risks: list[RiskItem]

class ReportNarrative(BaseModel):
    verdict_summary: str
    market_summary: str
    funding_summary: str
    scheme_explanations: dict[str, str]     # scheme_id -> plain-language explanation
    repayment_summary: str
    recommendations: list[str]
    next_steps: list[str]
    disclaimer: str
```
Share the final versions with the frontend dev in hour 2.

## 5. Report orchestration pipeline (`report_service.py`)

```
1. validate request (profile, idea, loan_preferences, lang)
2. local        = op2.local_market.get(district, business_type)           # data
3. market_score = op2.scoring.market_factor(local)
4. investment   = op2.investment.estimate(idea, local)                    # numbers
5. gap          = op2.finance.funding_gap(investment.total, profile.capital)
6. schemes      = op2.schemes.match(profile, gap.gap, idea) if gap.gap > 0 else []
7. repayment    = op2.finance.repayment_plan(loan, rate, tenure, projection)
8. projection   = op2.finance.projection(idea, local, investment)
9. credit       = op2.credit.readiness(profile)                           # bucket + action templates
10. score       = op2.scoring.feasibility_score(...)                       # number + verdict label
11. narrative   = llm.generate_json("report_narrative", {all of the above}, ReportNarrative, lang)
12. report      = merge(numbers from 2–10, words from 11)  → save via op2.db → return
```
- Run independent steps concurrently (`asyncio.gather` for 2–4 and 9).
- If step 11 fails twice → return the report with fallback narrative and `"narrative_source": "fallback"`.
- **Never let the LLM override numbers.** Narrative fields can mention numbers only if they were passed in; post-check by regex that quoted totals match computed totals (log mismatches).

## 6. Per-module prompt requirements

| Prompt | Inputs | Output |
|---|---|---|
| `discovery_rank` | Filtered businesses, user answers | Top 5 with `why_it_suits_you`, `watch_out_for` |
| `idea_normalize` | Raw text, lang | Structured idea + clarifying questions |
| `local_analysis` | Local data JSON (Op 2), business | `LocalAnalysisNarrative` |
| `report_narrative` | All computed numbers + matched schemes + credit bucket | `ReportNarrative` |
| `compare_rationale` | 2–3 numeric summaries | `best_fit_id`, 2-line reason per option |
| `document_tailor` | Base doc lists (Op 2), business, profile | Items with `why`, `where_to_get`, `approx_time`, `approx_cost` |
| `advisor_chat` | Profile + report summary + scheme list + last ~10 turns | Streamed answer; refuses off-topic |

**Advisor guardrails:** stay on business/finance for the user's case; no legal/tax guarantees; encourage verifying with bank/official portal; if asked "why was my score 62?", explain from the stored factor scores.

## 7. Contract with Operator 2 (what you can call)

You depend on these functions. Agree on signatures in **hour 1**; Operator 2 ships **stubs returning realistic mock data first**, real logic later.

```python
# op2 service interfaces (Pydantic models in app/schemas/)
catalogue.filter(answers: DiscoveryAnswers) -> list[Business]
local_market.get(district: str, business_type: str) -> LocalData       # includes confidence flag
investment.estimate(idea: Idea, local: LocalData) -> Investment        # items, total, fixed, working_capital
finance.funding_gap(total: float, capital: float) -> Gap               # gap, capital_ratio
schemes.match(profile: Profile, gap: float, idea: Idea) -> list[SchemeMatch]
finance.projection(idea, local, investment) -> Projection              # monthly[12], break_even_months
finance.repayment_plan(loan, rate, months, projection) -> Repayment    # emi, schedule, dscr, affordable
credit.readiness(profile: Profile) -> CreditResult                     # bucket, actions[], alternatives[]
scoring.feasibility_score(factors) -> ScoreResult                      # score, verdict_label, factor_scores
documents.base_lists(business_type) -> DocLists
db.save_report(report) / db.get_report(id)
```

## 8. Timeline (adapt to your hackathon length)

| Phase | Your deliverable |
|---|---|
| **H0–1** | Skeleton (`main.py`, `config.py`, routers stubbed, `/health`), agree contract with Op 2, push to Git |
| **H1–3** | `client.py`, `system_base.md`, schemas, `idea_normalize` end-to-end |
| **H3–6** | `report_service` pipeline against Op 2 stubs, `report_narrative` prompt |
| **H6–9** | `discovery_rank`, `local_analysis`, `/compare`, `/documents/checklist` |
| **H9–12** | `/advisor/chat` with streaming, multilingual testing (en/hi/mr) |
| **H12+** | Fallbacks, repair, prompt tuning on 3 demo personas, integration with real Op 2 logic |

## 9. Tests you write
- Schema validation: feed malformed LLM output → repair → fallback path works.
- Orchestrator: with mocked Op 2 + mocked LLM, report merges correctly and numbers are untouched.
- Language: same request in `en`, `hi`, `mr` returns valid JSON in each.
- Golden test: 3 demo personas produce stable verdict labels.
- Advisor: off-topic prompt is politely declined.

## 10. Definition of done
- [ ] All 7 endpoints return schema-valid JSON for the 3 demo personas
- [ ] Report generates in < 20s (target) with graceful fallback on LLM failure
- [ ] No hard-coded API keys; `.env.example` updated
- [ ] Prompts versioned in `llm/prompts/`
- [ ] Verified output in English, Hindi, Marathi (reviewed by a fluent speaker if possible)
- [ ] OpenAPI docs (`/docs`) show all your endpoints with example payloads

## 11. Working agreement with Operator 2
- Separate Git branches: `op1/…` and `op2/…`; merge via small PRs, at least once every 2–3 hours.
- Shared folders (`app/schemas/`, `app/data/`): Op 2 owns the files, Op 1 requests changes via PR comment or chat.
- Contract change = message the other operator **before** coding it.
- Sync call every 3 hours: 5 minutes, "what I finished / what I need from you".
