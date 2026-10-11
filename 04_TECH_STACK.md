# 04 · Tech Stack

## 1. At a glance

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **React 18 + Vite + TypeScript** | Fast dev, huge ecosystem, easy for a team |
| Styling / UI | **Tailwind CSS + shadcn/ui** | Quick, consistent, accessible components |
| Routing | React Router v6 | Simple multi-step flow |
| State | **Zustand** (+ `persist`) | Minimal boilerplate, survives refresh |
| Forms | React Hook Form + **Zod** | Validation shared with TS types |
| Data fetching | TanStack Query | Loading/error/retry handled |
| Charts | **Recharts** | Declarative, React-native charts |
| i18n | **react-i18next** | Standard, supports lazy-loaded languages |
| Voice | Web Speech API (STT + TTS) | No cost, works in Chrome/Android |
| Maps (optional) | Leaflet + OpenStreetMap | No API key |
| PDF | WeasyPrint (server) or jsPDF | Downloadable report |
| Backend | **Python 3.11 + FastAPI** | Async, auto docs, strong for AI/data work |
| Validation | **Pydantic v2** | Schemas for requests and LLM outputs |
| LLM | **Claude API** (Anthropic) | Strong multilingual + structured JSON output |
| DB | **SQLite** (demo) → PostgreSQL | Zero setup now, scalable later |
| ORM | SQLAlchemy 2 + Alembic | Standard migrations |
| Cache / limits | In-memory TTL cache (or Redis), slowapi | Cost control and abuse protection |
| Data processing | pandas | Preparing local datasets |
| Testing | pytest, Vitest, Playwright | Core logic + main flow |
| Deployment | **Vercel/Netlify** (FE) + **Render/Railway** (BE) | Free tiers, fast deploys |
| CI | GitHub Actions | Lint + test on push |

## 2. AI layer details

- **Model:** use a current Claude model via the API; keep the model name in an env var (`LLM_MODEL`) so you can swap without code changes. Check Anthropic's docs for the latest model strings.
- **Provider-agnostic wrapper:** `llm/client.py` exposes `generate_json()`. If you must use another provider (Gemini/OpenAI) because of hackathon rules or credits, only this file changes.
- **Structured output:** prompt for JSON + validate with Pydantic + one repair retry.
- **Grounding:** curated JSON data injected in the prompt (lightweight RAG). A vector DB is **not needed** at this scale; if you want to show RAG, embed scheme PDFs/FAQs into a small FAISS/Chroma index.
- **Streaming:** SSE for the advisor chat.
- **Cost control:** cache per `(business, district, lang)`, cap `max_tokens`, use a smaller/faster model for chat and a stronger one for the report if needed.

## 3. Multilingual strategy

| Content | Approach |
|---|---|
| Buttons, labels, forms | i18n JSON (`en`, `hi`, `mr`), LLM-drafted + human-reviewed |
| Report, advisor, explanations | LLM generates directly in selected language |
| Numbers/currency | `Intl.NumberFormat('en-IN')` |
| Fonts | Noto Sans / Noto Sans Devanagari |
| Voice | `hi-IN`, `mr-IN`, `en-IN` locales in Web Speech API |

## 4. Project setup (copy-paste)

**Frontend**
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm i react-router-dom zustand @tanstack/react-query axios \
      react-hook-form zod @hookform/resolvers recharts \
      react-i18next i18next lucide-react clsx
npm i -D tailwindcss postcss autoprefixer vitest @testing-library/react
npx tailwindcss init -p
npx shadcn@latest init
```

**Backend**
```bash
mkdir backend && cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings \
            sqlalchemy alembic anthropic httpx python-dotenv \
            slowapi pandas weasyprint jinja2 pytest
pip freeze > requirements.txt
uvicorn app.main:app --reload
```

## 5. Environment variables

```bash
# backend/.env
ANTHROPIC_API_KEY=your_key_here
LLM_MODEL=<model-string-from-docs>
DATABASE_URL=sqlite:///./app.db
CORS_ORIGINS=http://localhost:5173
CACHE_TTL_SECONDS=86400

# frontend/.env
VITE_API_URL=http://localhost:8000/api/v1
```
Never commit `.env`; commit `.env.example`.

## 6. Deployment

| Part | Service | Notes |
|---|---|---|
| Frontend | Vercel / Netlify | Set `VITE_API_URL` to backend URL |
| Backend | Render / Railway / Fly.io | Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| DB | SQLite file for demo; Neon/Supabase Postgres if persistence matters | |
| Secrets | Platform env settings | |

Free tiers can sleep: **hit the backend once before the demo** and keep a local fallback running.

## 7. Suggested team split (4 people example)

| Role | Owns |
|---|---|
| **A · Backend/AI** | LLM client, prompts, report orchestration, advisor |
| **B · Backend/Data** | Schemes JSON, rule engine, calculators, local data, suppliers |
| **C · Frontend core** | Questionnaire, finance page, report, dashboard |
| **D · Frontend/UX + pitch** | i18n, advisor UI, documents, suppliers, compare, deck + demo |

Adjust for 3 or 5 members. Agree on the **API contract (JSON schemas) in the first hour** so frontend and backend can work in parallel with mock data.

## 8. Alternatives (if constraints change)

| If… | Consider |
|---|---|
| Team prefers JS everywhere | Next.js + Node/Express (or Next API routes) |
| Need the fastest UI | Streamlit/Gradio (weaker for polish and multi-step UX) |
| Need auth + DB quickly | Supabase (Auth + Postgres) or Firebase |
| Must use a different LLM | Swap in `llm/client.py` (Gemini/OpenAI) |
| Low-literacy audience is the focus | Add WhatsApp bot (Twilio/Meta Cloud API) as a second channel |

## 9. Future roadmap (for the pitch's "scalability" slide)
- Real data integrations: Agmarknet prices, Census/NSSO demand indicators, Udyam/MSME data, bank scheme APIs.
- Account Aggregator (AA) framework for consented income/cash-flow data → better credit readiness.
- Direct bank/NBFC application hand-off with pre-filled forms.
- SHG and cooperative modules; group loan planning.
- Offline-first PWA, IVR/WhatsApp interface, more regional languages.
- Supplier verification, ratings, and in-app ordering.

## 10. Quick decision summary
**React + Vite + Tailwind + Recharts** on the front, **FastAPI + Pydantic + SQLite** on the back, **Claude API** for structured, multilingual AI, **curated JSON data** for grounding, deployed on **Vercel + Render**.
