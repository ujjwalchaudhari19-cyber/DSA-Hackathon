# 03 · Backend

## 1. Principles
1. **Numbers from code, words from the LLM.** All arithmetic (investment totals, gap, EMI, DSCR, score) is deterministic Python.
2. **Grounded AI.** Scheme facts, rates, document lists come from curated JSON; the LLM only explains/personalises.
3. **Structured outputs.** Every LLM call returns JSON validated by Pydantic; retry once on failure.
4. **Stateless API**, simple storage, easy to demo.

## 2. Architecture

```
React ──HTTPS──> FastAPI
                  ├─ routers/        (HTTP layer)
                  ├─ services/       (business logic)
                  │    ├─ discovery_service
                  │    ├─ analysis_service
                  │    ├─ investment_service
                  │    ├─ scheme_service      (rule engine)
                  │    ├─ finance_service     (EMI, DSCR, projections)
                  │    ├─ credit_service      (CIBIL readiness rules)
                  │    ├─ report_service      (orchestrator)
                  │    ├─ document_service
                  │    ├─ supplier_service
                  │    └─ advisor_service     (chat)
                  ├─ llm/            (client, prompts, schemas, repair)
                  ├─ data/           (schemes.json, businesses.json, local_data, suppliers)
                  └─ db/             (SQLite/Postgres models)
```

## 3. Folder structure

```
backend/
├─ app/
│  ├─ main.py
│  ├─ config.py               # env settings (pydantic-settings)
│  ├─ routers/
│  │   ├─ discovery.py  analysis.py  finance.py  schemes.py
│  │   ├─ credit.py     report.py    compare.py  documents.py
│  │   ├─ suppliers.py  advisor.py   i18n.py
│  ├─ services/ …
│  ├─ llm/
│  │   ├─ client.py           # Claude/other LLM wrapper
│  │   ├─ prompts/            # *.md or *.j2 templates per module
│  │   └─ schemas.py          # Pydantic models for LLM JSON outputs
│  ├─ models/                 # SQLAlchemy models
│  ├─ schemas/                # API request/response models
│  ├─ data/
│  │   ├─ businesses.json     # catalogue + cost templates
│  │   ├─ schemes.json        # govt schemes + rules
│  │   ├─ local_market.json   # per-district demo data
│  │   ├─ documents.json      # base doc lists
│  │   └─ suppliers.json
│  └─ utils/                  # emi.py, scoring.py, cache.py, pdf.py
├─ tests/
├─ requirements.txt
└─ .env.example
```

## 4. API endpoints

Base: `/api/v1` · JSON · `lang` accepted in body or `Accept-Language`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/discover/suggest` | Questionnaire answers → top businesses |
| POST | `/idea/normalize` | Free-text idea → structured idea |
| POST | `/analysis/local` | Location + business → market analysis + score |
| POST | `/finance/investment` | Idea + scale → itemised investment |
| POST | `/finance/gap` | Investment + capital → funding gap |
| POST | `/schemes/match` | Profile + gap → eligible schemes |
| POST | `/finance/emi` | Amount, rate, tenure → EMI + schedule + DSCR |
| POST | `/credit/readiness` | Quiz answers → readiness + action plan |
| POST | `/report/generate` | Orchestrates all → full feasibility report |
| GET | `/report/{id}/pdf` | PDF export |
| POST | `/compare` | 2–3 ideas → side-by-side + best fit |
| POST | `/documents/checklist` | Idea + profile → registration + loan docs |
| GET | `/suppliers` | Filter by category, district, price band |
| POST | `/advisor/chat` | Context-aware chat (SSE streaming) |
| GET | `/health` | Liveness |

### Example: `POST /report/generate`

```json
// request
{
  "lang": "mr",
  "profile": { "state": "Maharashtra", "district": "Nashik", "village": "Sinnar",
               "capital": 50000, "category": "obc", "gender": "f", "age": 34,
               "experience": "none", "collateral": false },
  "idea": { "business_type": "dairy", "scale": "small", "details": "4 cows, local milk sale" },
  "loan_preferences": { "tenure_months": 36 }
}
```

```json
// response (abridged)
{
  "id": "rep_01H…",
  "verdict": { "label": "feasible_with_conditions", "score": 68, "summary": "…" },
  "market": { "score": 72, "demand": "high", "customers": ["…"], "competitors": {"count": 6, "density": "medium"},
              "opportunities": ["…"], "risks": [{"name": "Fodder price", "severity": "medium", "mitigation": "…"}] },
  "investment": { "total": 285000, "fixed": 210000, "working_capital": 75000,
                  "items": [{"name": "Cattle (4)", "qty": 4, "unit_cost": 40000, "total": 160000}] },
  "funding": { "capital": 50000, "gap": 235000, "capital_ratio": 0.175 },
  "schemes": [{ "id": "mudra_kishore", "eligible": "yes", "reasons": ["…"], "benefits": "…",
                "interest_range": "…", "how_to_apply": ["…"] }],
  "repayment": { "loan": 235000, "rate": 10.5, "tenure": 36, "emi": 7637, "total_interest": 39932,
                 "dscr": 1.34, "affordable": true, "schedule": [ … ] },
  "projection": { "monthly": [ … 12 values … ], "break_even_months": 16 },
  "credit": { "bucket": "thin_file", "actions": ["…"], "alternatives": ["…"] },
  "recommendations": ["…"],
  "next_steps": ["…"],
  "disclaimer": "Estimates only. Verify scheme terms with the bank/official portal."
}
```
*(Figures above are illustrative, not real data.)*

## 5. Core calculations (deterministic)

```python
# utils/emi.py
def emi(principal: float, annual_rate_pct: float, months: int) -> float:
    r = annual_rate_pct / 12 / 100
    if r == 0: return principal / months
    f = (1 + r) ** months
    return principal * r * f / (f - 1)

def schedule(principal, annual_rate_pct, months, moratorium=0):
    bal, rows, e = principal, [], emi(principal, annual_rate_pct, months)
    r = annual_rate_pct / 12 / 100
    for m in range(1, months + 1):
        interest = bal * r
        principal_paid = 0 if m <= moratorium else e - interest
        bal -= principal_paid
        rows.append({"month": m, "emi": e if m > moratorium else interest,
                     "interest": interest, "principal": principal_paid, "balance": max(bal, 0)})
    return rows

def dscr(annual_net_profit, depreciation, annual_interest, annual_principal):
    return (annual_net_profit + depreciation + annual_interest) / (annual_principal + annual_interest)
```

```python
# utils/scoring.py
WEIGHTS = {"market": .25, "capital": .20, "repayment": .25, "breakeven": .15, "risk": .15}

def feasibility_score(f):          # f: dict of 0-100 factor scores
    return round(sum(WEIGHTS[k] * f[k] for k in WEIGHTS))

def verdict(score):
    return ("highly_feasible" if score >= 75 else
            "feasible_with_conditions" if score >= 55 else
            "risky" if score >= 40 else "not_recommended")
```

Factor mapping examples: `capital = min(100, capital_ratio*100*2)`, `repayment = scale DSCR 0.8→0, 1.5→100`, `breakeven = 100 if ≤12m, 0 if ≥48m (linear)`.

## 6. Scheme rule engine

`schemes.json` entry (structure; **fill values from official sources and record `last_verified`**):

```json
{
  "id": "pmegp",
  "name": "PMEGP",
  "type": "subsidy_linked_loan",
  "agency": "KVIC / DIC / KVIB",
  "sectors": ["manufacturing", "service"],
  "min_loan": null, "max_project_cost": null,
  "eligibility": {
    "min_age": 18,
    "new_unit_only": true,
    "categories": ["all"],
    "special_benefit_for": ["sc","st","obc","women","ex_servicemen","pwd"],
    "location_bonus": "rural"
  },
  "benefits": { "subsidy": "…", "own_contribution": "…" },
  "collateral": "…",
  "how_to_apply": ["Register on official portal", "Prepare project report", "Bank appraisal"],
  "documents": ["aadhaar", "pan", "project_report", "category_certificate"],
  "source_url": "https://…",
  "last_verified": "2026-10-11"
}
```

Starter list to research & encode: **PMEGP, PM Mudra Yojana (Shishu/Kishore/Tarun), Stand-Up India, PM SVANidhi (vendors), DAY-NRLM / SHG-bank linkage, CGTMSE (credit guarantee), PM-FME (food processing), state-specific schemes for your demo state.**

```python
def match(profile, gap, business):
    out = []
    for s in SCHEMES:
        reasons, ok = [], "yes"
        if business.sector not in s["sectors"]: ok = "no"; reasons.append("Sector not covered")
        if gap > (s.get("max_loan") or inf):    ok = "no"; reasons.append("Loan exceeds limit")
        if s["eligibility"].get("women_only") and profile.gender != "f": ok = "no"
        # …more rules; use "maybe" if a needed fact is missing
        out.append({**s, "eligible": ok, "reasons": reasons})
    return sorted(out, key=rank_key)
```

## 7. CIBIL readiness (rules, not scraping)

Inputs → buckets:
- No loans/cards + steady income → **thin_file**
- Active loans, no missed EMIs → **fair/strong** (by utilisation)
- Missed EMIs / settled accounts → **needs_repair**

Output templates (from JSON) per bucket: *what lenders check*, *30/60/90-day actions* (pay on time, keep card use low, avoid many applications, check free credit report for errors, add co-applicant), and *alternative routes* (SHG linkage, collateral-free schemes, guarantee-backed loans). LLM only rewrites in the user's language/tone.

## 8. LLM layer

```python
# llm/client.py (provider-agnostic wrapper)
async def generate_json(prompt_name: str, variables: dict, schema: type[BaseModel], lang: str):
    system = render("system_base.md", lang=lang)
    user = render(f"{prompt_name}.md", **variables)
    for attempt in range(2):
        raw = await provider.complete(system=system, user=user, temperature=0.3, max_tokens=3000)
        try:
            return schema.model_validate_json(extract_json(raw))
        except ValidationError as e:
            user += f"\n\nYour previous output was invalid: {e}. Return ONLY valid JSON."
    return fallback(prompt_name, variables)
```

**System prompt essentials**
- Role: financial-inclusion advisor for rural India; plain, respectful language at ~Class 8 reading level.
- Respond in `{lang}`; keep JSON keys in English.
- Use ONLY provided data for schemes, rates, numbers. If something is missing, say "not available" — do not guess.
- Never promise approval; add disclaimer.
- Output strictly the given JSON schema.

**Prompt modules:** `discovery_rank`, `idea_normalize`, `local_analysis`, `investment_adjust`, `report_narrative`, `compare_rationale`, `document_tailor`, `advisor_chat`.

**Advisor chat:** inject compact context (profile + latest report summary + scheme list) into system prompt; stream via SSE; cap history to last ~10 turns.

## 9. Data model (SQLite → Postgres)

| Table | Key columns |
|---|---|
| `users` (optional) | id, phone/email, lang, created_at |
| `profiles` | id, user_id, state, district, village, capital, category, gender, age, experience |
| `ideas` | id, profile_id, business_type, scale, details_json |
| `reports` | id, profile_id, idea_id, report_json, score, lang, created_at |
| `chat_messages` | id, report_id, role, content, created_at |
| `suppliers` | id, name, category, district, products, contact, price_band, moq |
| `supplier_leads` | id, supplier_id, report_id, message, created_at |

For the hackathon, JSON files + SQLite are enough; users/auth can be skipped (anonymous session id).

## 10. Cross-cutting concerns
- **Validation:** Pydantic on all requests; reject negative/absurd values.
- **Caching:** cache identical (business, district, lang) analysis calls for 24h (in-memory/Redis) to save cost and time.
- **Rate limiting:** `slowapi` per IP.
- **Timeouts/retries:** 30s LLM timeout, 1 retry; show partial results if one module fails.
- **Security:** keys in env only; CORS restricted to frontend origin; strip PII from logs; no storage of Aadhaar/PAN numbers (only checklist status).
- **Observability:** structured logs with request id; log LLM latency and token use.
- **PDF:** render report HTML → PDF with WeasyPrint (or let frontend generate).
- **Tests:** unit tests for EMI/DSCR/scoring/scheme rules; contract tests for JSON schemas; a few golden-file tests for the report on demo personas.

## 11. Data you need to prepare (biggest time sink, start early)
1. `businesses.json`: 8–12 businesses with cost templates, typical revenue, margins, space/skill needs.
2. `local_market.json`: 2–3 demo districts × those businesses (demand, competitors, avg prices, seasonality).
3. `schemes.json`: 8–10 schemes verified from official portals with `source_url` and `last_verified`.
4. `documents.json`: registration + loan base lists per business type.
5. `suppliers.json`: 15–30 curated suppliers (can be realistic sample data, clearly labelled as demo data).
6. UI translation files (`en`, `hi`, `mr`).

## 12. Honest-limits notes for the pitch
- Market and supplier data are curated/sample for the demo; the architecture plugs into real sources (Agmarknet, Census, Udyam, GeM, bank APIs) later.
- CIBIL feature is guidance, not credit-bureau integration.
- Scheme terms change; every scheme card shows source link and last-verified date.
