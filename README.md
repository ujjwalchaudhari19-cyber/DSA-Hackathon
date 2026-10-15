# GramUdyam AI

> Rural Enterprise Intelligence Platform — helping rural Indian entrepreneurs evaluate business feasibility, get matched to government schemes, and generate bankable financial reports in English, Hindi, and Marathi.

---

## Repository Layout

```
gramudyam-ai/
│
├── api/                        # FastAPI Python backend
│   ├── app/
│   │   ├── main.py             # App factory, middleware, CORS, rate-limiter
│   │   ├── config.py           # All settings via pydantic-settings (.env)
│   │   ├── data/               # JSON datasets (businesses, schemes, credit rules…)
│   │   ├── llm/                # LLM client, prompt templates, fallback generators
│   │   ├── models/             # SQLAlchemy ORM models (9 tables)
│   │   ├── routers/            # FastAPI route handlers (15 routers)
│   │   ├── schemas/            # Pydantic request / response models
│   │   ├── services/           # Business logic (finance, schemes, investment…)
│   │   └── utils/              # EMI engine, auth, rate-limiter, cache, scoring
│   ├── alembic/                # Database migration scripts
│   ├── tests/                  # Pytest test suite (11 modules)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── web/                        # React 19 + TypeScript frontend
│   ├── src/
│   │   ├── pages/              # 17 page components
│   │   ├── components/         # UI primitives, charts, layout, advisor drawer
│   │   ├── services/api.ts     # Axios client + typed API call functions
│   │   ├── store/              # Zustand state (profile, idea, report, lang, auth)
│   │   ├── data/               # UI labels only — no hardcoded business data
│   │   └── i18n/               # EN / HI / MR translation files
│   ├── e2e/                    # Playwright end-to-end tests
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── docs/                       # Architecture & workflow documentation
│   ├── 01_WORKFLOW.md
│   ├── 02_FRONTEND.md
│   ├── 03_BACKEND.md
│   ├── 03A_BACKEND_OPERATOR1_AI_ORCHESTRATION.md
│   ├── 03B_BACKEND_OPERATOR2_DATA_FINANCE.md
│   ├── 04_TECH_STACK.md
│   ├── AUTH_NOTES.md
│   └── FIX_LOG.md
│
├── docker-compose.yml          # One-command dev stack (api + web)
├── Makefile                    # Developer shortcuts (make dev, make test…)
├── .env.example                # Root environment template
├── .gitignore
└── README.md
```

---

## Quick Start

### Option A — Docker (recommended, zero-setup)

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd gramudyam-ai

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env — set at least one LLM key: GROQ_API_KEY or OPENAI_API_KEY

# 3. Start everything
docker-compose up
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

---

### Option B — Local Development

**Prerequisites:** Python 3.11+, Node.js 20+, npm 9+

```bash
# Install all dependencies
make install

# Copy environment files
cp .env.example .env
cp api/.env.example api/.env      # backend-specific vars
cp web/.env.example web/.env      # frontend-specific vars

# Run database migrations
make migrate

# Start both servers (opens api on :8000, web on :5173)
make dev
```

Or start each service separately:

```bash
make dev-api    # FastAPI on http://localhost:8000
make dev-web    # Vite on  http://localhost:5173
```

For local Firebase authentication, open the frontend at `http://localhost:5173`.
If you use another local hostname such as `127.0.0.1`, add that hostname under
Firebase Console → Authentication → Settings → Authorized domains.

---

## Environment Variables

### Root `.env` (used by docker-compose + both services)

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | Groq API key — free tier at [console.groq.com](https://console.groq.com) |
| `OPENAI_API_KEY` | — | OpenAI API key (gpt-4o-mini) |
| `ANTHROPIC_API_KEY` | — | Anthropic API key (claude-3) |
| `DATABASE_URL` | `sqlite:///./app.db` | SQLite (dev) or PostgreSQL URL |
| `FIREBASE_PROJECT_ID` | `gramudyog-d0862` | Firebase project for auth |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed origins |
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Frontend API base URL |

See `api/.env.example` and `web/.env.example` for the full list.

---

## API Reference

All endpoints are served at `http://localhost:8000/api/v1`.

### AI / LLM Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/discover/suggest` | AI-ranked business suggestions from questionnaire |
| `POST` | `/idea/normalize` | Free-text idea → structured business object |
| `POST` | `/analysis/local` | Local market analysis narrative |
| `POST` | `/report/generate` | Full 11-step feasibility report |
| `POST` | `/compare` | Side-by-side comparison of 2–3 ideas |
| `POST` | `/documents/checklist` | Tailored registration + loan document checklist |
| `POST` | `/advisor/chat` | SSE streaming AI advisor chat |

### Finance & Data Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/finance/business-items` | Live investment line-items for any business type |
| `GET`  | `/finance/monthly-profit/{id}` | Expected monthly profit + 12-month breakdown |
| `POST` | `/finance/investment` | Investment estimate (POST variant) |
| `POST` | `/finance/gap` | Funding gap calculation |
| `POST` | `/finance/projection` | 12-month financial projection (3 scenarios) |
| `POST` | `/finance/emi` | EMI + amortization schedule |
| `GET`  | `/schemes/all` | All 9 government schemes from data store |
| `POST` | `/schemes/match` | Match schemes to entrepreneur profile |
| `POST` | `/credit/readiness` | CIBIL readiness bucket assessment |
| `GET`  | `/catalogue` | Business catalogue |
| `GET`  | `/suppliers` | Supplier directory |
| `GET`  | `/report/{id}/pdf` | Download report as PDF |

Full interactive docs: **http://localhost:8000/docs**

---

## Architecture

```
Browser (web/)
  └─ React 19 + Vite + Recharts + Zustand
       │  REST + SSE  (Axios + Firebase JWT)
       ▼
API Server (api/)
  ├── Operator 1 — LLM Orchestration
  │     ├── MultiProvider (OpenAI → Groq → Anthropic, auto-fallback)
  │     ├── Markdown prompt templates  →  structured JSON output
  │     └── Hardened fallback templates (runs without any API key)
  │
  └── Operator 2 — Deterministic Finance Engine
        ├── Investment estimator   (businesses.json cost templates)
        ├── Financial projector    (seasonality × revenue model)
        ├── EMI / amortization     (reducing-balance algorithm)
        ├── Scheme matcher         (rule-based, schemes.json)
        ├── Credit readiness       (credit_rules.json)
        └── Local market lookup    (local_market.json)
                  │
           SQLite / PostgreSQL
           (SQLAlchemy 2.0 + Alembic)
```

### Data Flow — Dynamic Charts

All 6 charts in the Dashboard and all investment items in Finance are driven entirely by live API data:

| Source | Endpoint | Replaces |
|--------|----------|----------|
| Investment line-items | `GET /finance/business-items` | Hardcoded `BUSINESS_ITEMS` map |
| Government schemes | `GET /schemes/all` | Hardcoded `TRANSPORT_SCHEME`, `PM_FME_SCHEME` objects |
| Monthly profit / DSCR | `GET /finance/monthly-profit/{id}` | Hardcoded `MONTHLY_PROFIT_BY_BUSINESS` table |
| All 6 dashboard charts | `POST /report/generate` → Zustand store | Hardcoded fallback arrays |

When no report exists, the dashboard shows an empty-state with a "Generate Report" call-to-action instead of fake placeholder data.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI 0.115 + Uvicorn |
| ORM / Migrations | SQLAlchemy 2.0 + Alembic |
| Validation | Pydantic v2 + pydantic-settings |
| LLM providers | OpenAI / Groq / Anthropic (auto-fallback) |
| Authentication | Firebase Admin SDK (JWT verification) |
| PDF generation | WeasyPrint + Jinja2 |
| Frontend framework | React 19 + TypeScript + Vite 8 |
| Charts | Recharts 3 (Pie, Bar, Line, Area, Radar) |
| State management | Zustand 5 + persist middleware |
| Server state | TanStack React Query 5 |
| Routing | React Router 7 |
| Localisation | i18next (EN / HI / MR) |
| Auth client | Firebase Auth (Google + anonymous) |
| Styling | Tailwind CSS 3 |
| HTTP client | Axios |
| Containerisation | Docker + docker-compose |

---

## Supported Business Types

| ID | Business |
|----|----------|
| `dairy_small` | Dairy (small unit) |
| `kirana_store` | Kirana / general store |
| `tailoring` | Tailoring and boutique |
| `poultry_farming` | Broiler poultry unit |
| `goat_farming` | Goat rearing unit |
| `mobile_repair` | Mobile repair shop |
| `flour_spice_mill` | Flour & spice grinding mill |
| `tiffin_food_stall` | Tiffin / food stall |
| `mushroom_farming` | Mushroom cultivation |
| `csc_eseva_center` | CSC / eSeva center |
| `commercial_transport` | Commercial goods carrier |

Custom types are supported via dynamic fallback synthesis — the engine generates cost templates on-the-fly for any unlisted business description.

---

## Government Schemes

All 9 schemes are stored in `api/app/data/schemes.json` and served live via `GET /api/v1/schemes/all`:

| ID | Scheme | Max Loan |
|----|--------|----------|
| `mudra` | PM MUDRA Yojana | ₹10 Lakh |
| `pmegp` | PM Employment Generation Programme | ₹50 Lakh |
| `stand_up_india` | Stand-Up India | ₹1 Crore |
| `pm_svanidhi` | PM SVANidhi | ₹50,000 |
| `day_nrlm` | DAY-NRLM SHG Bank Linkage | ₹10 Lakh |
| `pm_fme` | PM-FME (Food Processing) | ₹10 Lakh |
| `cgtmse` | CGTMSE Credit Guarantee | ₹5 Crore |
| `cmegp_maharashtra` | CMEGP Maharashtra | ₹50 Lakh |
| `annasaheb_patil` | Annasaheb Patil (MH) | ₹15 Lakh |

---

## Running Tests

```bash
make test           # run everything
make test-api       # pytest (backend only)
make test-web       # vitest (frontend only)
```

---

## Deployment

1. Set `DATABASE_URL` to a PostgreSQL URL.
2. Set `ENV=production` and `DEBUG=false`.
3. Configure `FIREBASE_SERVICE_ACCOUNT_PATH` for server-side auth.
4. Set `CORS_ORIGINS` to your production frontend domain.
5. Run `make migrate` before first boot.
6. Use `docker-compose up` or deploy `api/` and `web/` independently.

---

## Languages

| Code | Language |
|------|----------|
| `en` | English |
| `hi` | Hindi (हिन्दी) |
| `mr` | Marathi (मराठी) |

---

## Docs

Detailed design and architecture notes are in [`docs/`](./docs/):

- [`01_WORKFLOW.md`](docs/01_WORKFLOW.md) — end-to-end user flow
- [`03A_BACKEND_OPERATOR1_AI_ORCHESTRATION.md`](docs/03A_BACKEND_OPERATOR1_AI_ORCHESTRATION.md) — LLM orchestration layer
- [`03B_BACKEND_OPERATOR2_DATA_FINANCE.md`](docs/03B_BACKEND_OPERATOR2_DATA_FINANCE.md) — deterministic finance engine
- [`04_TECH_STACK.md`](docs/04_TECH_STACK.md) — full dependency manifest
- [`AUTH_NOTES.md`](docs/AUTH_NOTES.md) — Firebase auth integration notes

---

*Built for the DSA Hackathon. Government scheme data is sourced from official Indian government portals for informational purposes only.*
