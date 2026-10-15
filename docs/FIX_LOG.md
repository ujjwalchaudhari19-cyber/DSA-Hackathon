# FIX_LOG

## Repo map
| Concept | File(s) found | Notes |
|---|---|---|
| EMI / schedule | `app/utils/emi.py` | Reference R1 implementation with `payment` row key, moratorium interest-only, final balance 0 |
| DSCR | `app/utils/emi.py` | Unified DSCR = cash available for debt service / debt service (operating profit before interest) |
| Scoring / verdict | `app/utils/scoring.py` | Reference R2 implementation: 5 clamped factors (sum to 1.0), verdict mapping and caps |
| Projection / break-even | `app/utils/scoring.py`, `app/services/op2_stubs.py` | 12-month cyclical repeating profile up to 60 months |
| LLM client | `app/llm/client.py`, `repair.py`, `fallbacks.py`, `placeholders.py` | Reference R4 provider adapter with 3-pass generation and R5 placeholder validation |
| Report pipeline | `app/services/report_service.py`, `app/services/report_pipeline.py` | Reference R7 11-step execution order with wave 1 & 2 parallelization and warnings |
| Scheme matcher | `app/services/scheme_rules.py` | Reference R6 matcher (`yes`, `partial`, `maybe`, `no`, `verify_on_portal`, `fallback_options`) |
| Business resolution | `app/services/business_resolver.py` | Tier-1 alias matching, Tier-3 fallback, Prohibited activity blocking (422) |
| Error handling | `app/errors.py` | Reference R3 central AppError and JSON response formatter with `request_id` |
| Routers / main.py | `app/main.py`, `app/routers/*.py` | All routers registered under `/api/v1` with central error middleware |
| DB models / report storage | `app/services/op2_stubs.py` | Session-isolated in-memory store with `owner_session` |
| PDF | `app/routers/report_pdf.py` | Lazy WeasyPrint import returning 501 `PDF_UNAVAILABLE` JSON and `/report/{id}/print` HTML view |
| Cache & Idempotency | `app/utils/idempotency.py` | In-memory single-flight and TTL deduplication using `Idempotency-Key` |
| Rate limit / CORS | `app/main.py`, `app/config.py` | slowapi & configurable CORS origins |
| Data files (`app/data/*.json`) | `scripts/validate_data.py` | Data validator verified clean (exit code 0) |
| Tests (`tests/`) | `tests/test_finance.py`, `tests/test_llm_client.py`, `tests/test_report_logic.py`, `tests/test_security_errors.py`, `tests/test_operator1.py`, `tests/test_edge_cases.py` | 78 tests total across all suites, 100% passing |

## Baseline (before changes)
compileall: pass · ruff: 95 issues · pytest: 8 passed / 0 failed

## Tasks
| Task | Status | Commit / Changes | Notes |
|---|---|---|---|
| T01 | DONE | `app/utils/emi.py` | Renamed row key `emi` -> `payment`, moratorium interest-only, final balance 0 |
| T02 | DONE | `app/utils/scoring.py` | Unified DSCR definition, break-even 60m cycle, verdict capping |
| T03 | DONE | `app/schemas/models.py` | Shared contracts frozen with Pydantic v2 conventions |
| T04 | DONE | `app/services/report_service.py` | Implemented strict 11-step pipeline, wave 1/2 concurrency, self-funded path |
| T05 | DONE | `app/services/business_resolver.py` | Alias matching, unknown business fallback, prohibited idea filtering (422) |
| T06 | DONE | `app/llm/client.py` | ProviderTransientError, 3-pass retry/repair/fallback, prompt injection hygiene |
| T07 | DONE | `app/llm/placeholders.py` | Placeholder parsing, `inr()` Indian digit grouping, loose number rejection |
| T08 | DONE | `app/errors.py` | Central exception handlers, standard `{error: {code, message, details, request_id}}` |
| T09 | DONE | `app/schemas/models.py` | Added `warnings`, `data_confidence`, `rate_source`, `narrative_source`, `fallback_options`, `saved` |
| T10 | DONE | `app/services/scheme_rules.py` | Matcher ranking, `partial` coverage, `maybe`, `verify_on_portal`, `fallback_options` |
| T11 | DONE | `app/security.py`, `app/routers/report.py` | `X-Session-Id` header, session-bound reports with 404 isolation, payload limits |
| T12 | DONE | `app/config.py`, `app/main.py` | CORS exact origins, payload limit middleware (100KB), slowapi integration |
| T13 | DONE | `app/security.py`, `app/routers/advisor.py` | SSE response headers, client disconnect awareness, streaming chat |
| T14 | DONE | `app/utils/idempotency.py` | Cache keying, single-flight in-memory deduplication |
| T15 | DONE | `app/routers/report.py` | `Idempotency-Key` header support |
| T16 | DONE | `app/routers/report_pdf.py` | Lazy WeasyPrint import with 501 `PDF_UNAVAILABLE` JSON and browser `/print` HTML fallback |
| T17 | DONE | `scripts/validate_data.py` | Schema and date validator clean |
| T18 | DONE | `backend/README.md`, docs | Updated documentation with new contract shapes and headers |
| T19 | DONE | `tests/test_edge_cases.py` | 21 edge-case tests mapping directly to E01-E50 matrix |
| T20 | DONE | Final verification | All 78 tests passing clean |

## Contract changes (for frontend)
| Change | Frontend impact |
|---|---|
| Schedule rows use `payment` (not `emi`) | Update `AmortTable` row access to `row.payment` |
| `repayment` can be `null`; `dscr` can be `null` | Display "No loan needed" / self-funded UI path |
| New fields on report: `warnings[]`, `data_confidence`, `rate_source`, `narrative_source`, `fallback_options[]`, `saved` | Display warning alerts, data confidence badge, rate source attribution |
| Error shape `{error: {code, message, details, request_id}}` | Map `error.code` to translated client messages |
| `X-Session-Id` header | Store in localStorage; send on every request |
| `Idempotency-Key` header | Optional UUID per report generation click to prevent duplicate billable runs |
| `PDF_UNAVAILABLE` (501) | Redirect or trigger browser window print dialog via `/report/{id}/print` |
| Schemes return `partial` with `covers` and `uncovered_gap` | Display covered vs uncovered loan amounts |

## Assumptions made
- `DEFAULT_MARKET_RATE` = 12.0 when no scheme rate is eligible or specified.
- Single-worker demo configuration uses in-memory idempotency and SQLite with busy timeout.

## Data that a human must supply
| File | Id | Field | Why |
|---|---|---|---|
| None pending | - | - | Core validation passes clean |

## Final verification output
- `python -m compileall app`: 0 errors
- `python scripts/validate_data.py app/data`: OK
- `pytest`: 78 passed in 64.48s
