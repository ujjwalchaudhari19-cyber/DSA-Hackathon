# 03B · Backend: Operator 2 (Data, Finance Engine & Infrastructure)

> Split of `03_BACKEND.md` between two backend operators.
> **Operator 2 owns everything deterministic: data, calculators, rules, database, caching, PDF.**
> **Operator 1** (see `03A_BACKEND_OPERATOR1_AI_ORCHESTRATION.md`) owns LLM calls, prompts and report orchestration.

**Golden rule:** numbers come from your code, never from the LLM. Everything you build must be explainable and testable without an API key.

---

## 1. Your scope

| Area | Included |
|---|---|
| Datasets | Business catalogue + cost templates, local market data, schemes, documents base lists, suppliers |
| Calculators | Investment estimate, funding gap, projection, break-even, EMI + schedule, DSCR |
| Rule engines | Scheme eligibility matcher, CIBIL readiness buckets, feasibility scoring |
| Endpoints | Finance, schemes, credit, suppliers, PDF |
| Infrastructure | DB models, caching, rate limiting, PDF export, tests for all of the above |

**Not yours:** LLM client, prompts, report narrative, advisor chat, `main.py`/`config.py` skeleton (Operator 1 creates in hour 1).

## 2. Endpoints you own

| Method | Path | What it does |
|---|---|---|
| POST | `/api/v1/finance/investment` | Idea + scale (+ local prices) → itemised investment |
| POST | `/api/v1/finance/gap` | Total investment + capital → gap, capital ratio |
| POST | `/api/v1/finance/emi` | Amount, rate, tenure, moratorium → EMI, schedule, total interest, DSCR, affordability |
| POST | `/api/v1/schemes/match` | Profile + gap + idea → eligible/maybe/no per scheme with reasons |
| POST | `/api/v1/credit/readiness` | Quiz answers → bucket + 30/60/90-day actions + alternative routes |
| GET | `/api/v1/suppliers` | Filter by category, district, price band, MOQ |
| POST | `/api/v1/suppliers/{id}/lead` | Save a quote request |
| GET | `/api/v1/report/{id}/pdf` | Render saved report to PDF |

## 3. Folder ownership

```
backend/app/
├─ data/
│   ├─ businesses.json   schemes.json     local_market.json
│   ├─ documents.json    suppliers.json   credit_rules.json
├─ routers/
│   ├─ finance.py   schemes.py   credit.py   suppliers.py   (pdf route in report.py: coordinate with Op 1)
├─ services/
│   ├─ catalogue_service.py   local_market_service.py   investment_service.py
│   ├─ finance_service.py     scheme_service.py         credit_service.py
│   ├─ scoring_service.py     supplier_service.py       document_base_service.py
├─ models/            # SQLAlchemy models
├─ schemas/           # Pydantic API models (shared; you own, Op 1 requests changes)
└─ utils/
    ├─ emi.py   scoring.py   cache.py   pdf.py   ratelimit.py
```

## 4. Data deliverables (start immediately, biggest time sink)

### 4.1 `businesses.json` (8–12 businesses)
Per business:
```json
{
  "id": "dairy_small",
  "name": "Dairy (small unit)",
  "sector": "agri_allied",
  "min_investment": null, "max_investment": null,
  "space_needed": "shed", "skills": ["animal_care"], "time": "full",
  "cost_template": [
    {"item": "Cattle", "unit": "per animal", "unit_cost": null, "qty_by_scale": {"small": 4, "medium": 10}},
    {"item": "Shed", "unit": "lump", "unit_cost": null},
    {"item": "Working capital (3 months)", "unit": "lump", "unit_cost": null},
    {"item": "Contingency", "unit": "pct", "value": 10}
  ],
  "revenue_model": {"unit": "litre", "price": null, "units_per_month_by_scale": {"small": null}},
  "variable_cost_pct": null, "fixed_opex_monthly": null,
  "seasonality": [1,1,1,0.9,0.9,0.9,1,1,1.1,1.1,1.1,1],
  "required_docs_key": "food_agri"
}
```
Suggested set: dairy, poultry, goat farming, kirana/general store, tailoring/boutique, mobile & small electronics repair, flour/spice mill (agri processing), tiffin/food stall, mushroom or vegetable farming, handicraft unit, e-seva/CSC centre.
**Fill `null`s with realistic values from reputable sources** (agri universities, NABARD model projects, MSME schemes, local market surveys). Mark each file with `source` and `last_verified`.

### 4.2 `local_market.json` (2–3 demo districts × all businesses)
Fields: population band, nearest towns/markets + distance, competitor count & density, avg selling price, demand level, seasonal notes, input availability, `confidence: high|medium|approximate`. Fallback to state/national averages when a district is missing.

### 4.3 `schemes.json` (8–10, verified from official portals)
Starter list: **PMEGP, PM Mudra (Shishu/Kishore/Tarun), Stand-Up India, PM SVANidhi, DAY-NRLM / SHG-bank linkage, CGTMSE, PM-FME, plus 1–2 state schemes for your demo state.**
Structure (from `03_BACKEND.md` §6) with: `eligibility`, `benefits`, `collateral`, `interest_range`, `how_to_apply[]`, `documents[]`, `source_url`, **`last_verified`**.
⚠️ Never copy numbers from memory or blogs. Use official scheme pages/guidelines.

### 4.4 Other files
- `documents.json`: registration list and loan list per `required_docs_key` (Udyam, GST threshold note, FSSAI for food, local body licence, Aadhaar, PAN, bank statements, project report, quotations, category certificate, etc.) each with `why`, `where`, `approx_time`, `approx_cost`.
- `suppliers.json`: 15–30 **clearly labelled demo/sample suppliers** across categories × districts: `name, category, products, district, contact, price_band, moq, distance_km`.
- `credit_rules.json`: buckets, quiz-to-bucket rules, action templates per bucket, alternative routes.

## 5. Calculators & engines

### 5.1 Investment (`investment_service.py`)
```
for each item in cost_template:
    qty = qty_by_scale[scale] (or user override)
    line_total = qty × unit_cost × local_price_factor
contingency = 10% of subtotal
total = fixed + working_capital + contingency
```
- Return `items[]`, `fixed`, `working_capital`, `total`.
- Validate all totals in code; accept user edits to quantities and recompute.

### 5.2 Gap
```
gap = max(0, total − capital);  capital_ratio = capital / total
```

### 5.3 Projection (12 months)
```
revenue_m   = units_per_month × price × seasonality[m]
net_profit_m = revenue_m × (1 − variable_cost_pct) − fixed_opex_monthly
break_even_months = first month where cumulative net_profit ≥ total_investment (cap at 60, else "not within 5 yrs")
```
Include a 3-scenario toggle: **base / pessimistic (−20% revenue) / optimistic (+15%)**. The report should use base but show pessimistic DSCR.

### 5.4 EMI, schedule, DSCR (`utils/emi.py`)
```python
def emi(P, annual_rate_pct, n):
    r = annual_rate_pct/12/100
    return P/n if r == 0 else P*r*(1+r)**n / ((1+r)**n - 1)
```
- `schedule()` with optional moratorium (interest-only months).
- `dscr = (annual_net_profit + depreciation + annual_interest) / (annual_principal + annual_interest)`.
- `affordable = dscr ≥ 1.25` and `EMI ≤ 50% of average monthly net profit`.
- Validate: P > 0, 0 ≤ rate ≤ 40, 6 ≤ n ≤ 120.

### 5.5 Scheme matcher (`scheme_service.py`)
- Pure rules on `profile` (age, gender, category, location type, experience, collateral), `gap`, `business.sector`, `business stage = new`.
- Return per scheme: `eligible: yes | maybe | no`, `reasons[]`, `missing_info[]`.
- Rank: eligible → higher subsidy → lower interest → no collateral.
- If no scheme eligible, return `fallback_options[]` (SHG route, co-applicant, reduce scale, microfinance/NBFC) so Operator 1's narrative never faces an empty list.

### 5.6 CIBIL readiness (`credit_service.py`)
Buckets from quiz: `strong | fair | thin_file | needs_repair`. Return `actions_30_60_90[]`, `what_lenders_check[]`, `alternative_routes[]` from `credit_rules.json`. **Guidance only; no bureau integration; include disclaimer text.**

### 5.7 Scoring (`utils/scoring.py`)
```python
WEIGHTS = {"market": .25, "capital": .20, "repayment": .25, "breakeven": .15, "risk": .15}
```
Factor mapping (document it in the code docstring so judges can see it's transparent):
- `market` = local demand/competition score (from `local_market`)
- `capital` = `min(100, capital_ratio × 200)`
- `repayment` = linear map DSCR 0.8 → 0, 1.5 → 100
- `breakeven` = 100 if ≤ 12 months, 0 if ≥ 48, linear between
- `risk` = 100 − weighted risk severity from local data

Return `{score, verdict_label, factor_scores}`. Verdicts: ≥75 `highly_feasible`; 55–74 `feasible_with_conditions`; 40–54 `risky`; <40 `not_recommended`.

## 6. Infrastructure

| Item | Spec |
|---|---|
| **DB** | SQLite via SQLAlchemy 2; tables: `profiles`, `ideas`, `reports`, `chat_messages`, `suppliers`, `supplier_leads`. Alembic migrations. Anonymous session id (no auth for demo). |
| **Caching** | TTL cache (24h) on local-market lookups and identical `(business, district, scale)` investment calls; simple in-memory or Redis. Expose `cache.get/set`. Op 1 also uses it for LLM analysis calls. |
| **Rate limiting** | `slowapi`: e.g. 30 req/min/IP general, 10/min on AI endpoints (coordinate with Op 1). |
| **PDF** | Jinja2 HTML template → WeasyPrint. Sections mirror the report. Must render Devanagari (install Noto fonts). |
| **Security** | Don't store Aadhaar/PAN numbers; only document checklist status. Strip PII from logs. |

## 7. Contract with Operator 1 (what you must provide)

```python
catalogue.filter(answers: DiscoveryAnswers) -> list[Business]
local_market.get(district: str, business_type: str) -> LocalData
investment.estimate(idea: Idea, local: LocalData) -> Investment
finance.funding_gap(total: float, capital: float) -> Gap
schemes.match(profile: Profile, gap: float, idea: Idea) -> list[SchemeMatch]
finance.projection(idea, local, investment) -> Projection
finance.repayment_plan(loan, rate, months, projection) -> Repayment
credit.readiness(profile: Profile) -> CreditResult
scoring.feasibility_score(factors) -> ScoreResult
documents.base_lists(business_type) -> DocLists
db.save_report(report) / db.get_report(id)
```
**Hour 1 priority:** ship **stubs that return realistic hard-coded data** with the final Pydantic models, so Operator 1 and the frontend can integrate immediately. Replace stubs with real logic one at a time, without changing signatures.

## 8. Timeline (adapt to your hackathon length)

| Phase | Your deliverable |
|---|---|
| **H0–1** | Agree contract; Pydantic models in `app/schemas/`; stubs for all services; push to Git |
| **H1–4** | `emi.py`, `finance_service`, `scoring`, tests; `businesses.json` first 3 businesses (dairy, kirana, tailoring) |
| **H4–7** | `scheme_service` + `schemes.json` (verified), `credit_service` + rules |
| **H7–10** | `local_market.json` for demo districts, `investment_service`, `projection`, remaining businesses |
| **H10–12** | DB models, `save_report/get_report`, `suppliers` + endpoints, `documents.json` |
| **H12–14** | PDF export, caching, rate limiting |
| **H14+** | Replace stub data with verified data, edge-case tests, support Op 1 with golden personas |

## 9. Tests you write (pytest)
- `emi`: known textbook values; zero-rate case; moratorium schedule sums back to principal.
- `dscr`/`affordable`: boundary cases (1.24 vs 1.25).
- `investment`: totals equal sum of items; contingency applied once.
- `projection`: break-even logic; seasonality effects; scenario toggles.
- `scheme_service`: one test per scheme per eligibility outcome (yes/maybe/no) + "no scheme eligible" fallback.
- `credit_service`: each bucket reachable from quiz inputs.
- `scoring`: weights sum to 1; verdict thresholds.
- Data validation script: every JSON file loads, no `null` placeholders left in demo businesses, every scheme has `source_url` and `last_verified`.

## 10. Definition of done
- [ ] All stubs replaced with real logic for the 3 demo personas
- [ ] No `null` placeholders in demo data; every scheme has source link + last-verified date
- [ ] Calculator tests pass; coverage on `utils/` and `services/` ≥ 80%
- [ ] Every endpoint documented in `/docs` with example request/response
- [ ] PDF renders Marathi/Hindi text correctly
- [ ] Supplier and local-market data labelled as demo/sample where applicable
- [ ] Data validation script runs clean in CI

## 11. Working agreement with Operator 1
- Branches `op2/…` and `op1/…`; small PRs at least every 2–3 hours.
- You own `app/schemas/` and `app/data/`; Operator 1 requests changes via PR comment or chat.
- Any signature change = message Operator 1 **before** you push it.
- Sync call every 3 hours: 5 minutes, "what I finished / what I need from you".
- If Operator 1 reports a number that looks wrong in a report, it's your calculator to fix, not a prompt issue.
