# 02 · Frontend

## 1. Goals
- **Simple enough for first-time smartphone users** (large touch targets, icons + text, minimal typing).
- **Mobile-first**, works on low bandwidth.
- **Multilingual** from day one (English, Hindi, Marathi; extensible).
- **Visual**: numbers become charts, not paragraphs.

## 2. Stack
React 18 + Vite (or Next.js 14 App Router) · TypeScript · Tailwind CSS · shadcn/ui · React Router · Zustand · React Hook Form + Zod · TanStack Query · Recharts · react-i18next · jsPDF/html2canvas (or backend PDF) · Web Speech API.

## 3. Pages & routes

| Route | Page | Purpose |
|---|---|---|
| `/` | Landing | Pitch, language picker, "Start" CTA |
| `/discover` | Choose Your Business | Multi-step questionnaire |
| `/discover/results` | Suggestions | 3–5 recommended businesses |
| `/idea` | Business Idea | Text/voice input + confirmation |
| `/profile` | Entrepreneur Profile | Location, capital, category, experience |
| `/analysis` | Local Business Analysis | Demand, competition, risks |
| `/finance` | Investment + Schemes + Calculator | Gap, matched schemes, EMI sliders |
| `/credit` | CIBIL Readiness | Quiz + action plan |
| `/report` | Feasibility Report | Full report + PDF download |
| `/dashboard` | Visual Dashboard | Charts and KPIs |
| `/compare` | Business Comparison | Side-by-side up to 3 |
| `/documents` | Document Checklist | Registration + loan documents |
| `/suppliers` | B2B Connect | Supplier directory |
| `*` (floating) | AI Advisor | Chat drawer available everywhere |

A **stepper/progress bar** at the top shows: Discover → Idea → Analysis → Finance → Report → Next steps.

## 4. Folder structure

```
frontend/
├─ src/
│  ├─ app/                  # router, providers
│  ├─ pages/                # one file per route
│  ├─ components/
│  │  ├─ ui/                # shadcn primitives (Button, Card, Dialog…)
│  │  ├─ layout/            # Navbar, Stepper, LanguageSwitcher, Footer
│  │  ├─ discover/          # QuestionStep, OptionCard, BusinessCard
│  │  ├─ finance/           # InvestmentTable, GapBar, SchemeCard, EmiSlider, AmortTable
│  │  ├─ charts/            # DonutInvestment, BarCapitalGap, LineProfit, AreaLoan, RiskRadar, ScoreGauge
│  │  ├─ report/            # VerdictBanner, Section, RiskList, NextSteps
│  │  ├─ advisor/           # ChatDrawer, MessageBubble, VoiceButton
│  │  ├─ documents/         # ChecklistGroup, DocItem
│  │  └─ suppliers/         # SupplierCard, SupplierFilters
│  ├─ hooks/                # useReport, useSchemes, useSpeech, useLocalCache
│  ├─ store/                # zustand slices: profile, idea, report, ui
│  ├─ services/             # api.ts (axios/fetch wrapper), endpoints
│  ├─ i18n/                 # en.json, hi.json, mr.json, index.ts
│  ├─ lib/                  # formatters (₹, lakh/crore), emi.ts, validators
│  ├─ types/                # shared TS types mirroring backend schemas
│  └─ styles/
└─ public/                  # icons, manifest.json (PWA)
```

## 5. State management

```ts
// store/useAppStore.ts (Zustand)
interface AppState {
  lang: 'en' | 'hi' | 'mr';
  profile: { state: string; district: string; village?: string; capital: number;
             category: 'general'|'obc'|'sc'|'st'; gender: 'f'|'m'|'o'; age: number;
             experience: 'none'|'some'|'experienced' };
  discovery: { interests: string[]; budgetRange: [number, number]; space: string; skills: string[] };
  idea: { raw: string; normalized?: BusinessIdea };
  report?: FeasibilityReport;
  compareList: BusinessIdea[];
  setLang(l: AppState['lang']): void;
  // …setters
}
```
Persist `profile`, `idea`, `report`, `lang` via `zustand/middleware` → `localStorage` (so a refresh or network drop doesn't lose progress).

## 6. Key screens in detail

### 6.1 Choose Your Business (questionnaire)
- One question per screen, big image-cards, progress dots, **Back/Next**.
- Questions: interests (multi-select) → budget (slider with ₹ presets) → time (full/part) → space/land → skills → location type → electricity/water → risk comfort.
- Result page: cards showing *Investment range · Monthly income range · Difficulty · "Why it suits you"* with **Select** and **Compare** buttons.

### 6.2 Local Analysis
- Header with location chip, **market score gauge**.
- Three columns (stack on mobile): *Demand & customers* · *Competitors* · *Opportunities & risks*.
- A small "Data confidence" badge (high/medium/approximate).

### 6.3 Finance page (core screen)
- **InvestmentTable**: editable line items (user can tweak quantities → totals recalculated client-side + validated on server).
- **GapBar**: capital vs. total investment with the gap highlighted.
- **SchemeCards**: eligibility chip (✅ eligible / ⚠️ maybe / ❌ not), benefits, interest, subsidy, "How to apply" accordion.
- **EmiSlider**: amount, tenure, rate → live EMI, total interest, amortisation table, affordability indicator (EMI vs. projected profit).

### 6.4 CIBIL Readiness
- 6-question quiz → readiness badge (*Strong / Fair / Thin-file / Needs repair*) → timeline of actions → alternative loan routes.
- Add a clear disclaimer: "Guidance only. We do not access your credit report."

### 6.5 Report & Dashboard
- Report: verdict banner (colour-coded), expandable sections, **Download PDF**, **Share link** (optional), **Ask advisor about this** button.
- Dashboard: KPI cards (investment, gap, EMI, break-even months, score) + 6 charts. Same data as report; different lens.

### 6.6 Comparison
- Table with sticky first column, "Best fit" badge on the winner per row and overall, mini sparkline for 12-month profit.

### 6.7 Documents
- Two tabs: **Register your business** / **Get your loan**. Each doc shows *Why · Where to get · Time · Cost* and a checkbox; progress ring on top; print/PDF button.

### 6.8 B2B Suppliers
- Filters: category, distance, price band, MOQ. Card: name, products, location, rating (if any), **Call / WhatsApp / Request quote**.
- Optional map view (Leaflet + OSM, no API key needed).

### 6.9 AI Advisor
- Floating button → right-side drawer (bottom sheet on mobile).
- Streaming responses (SSE), suggested-prompt chips, mic button (speech-to-text), speaker button (text-to-speech), language follows the app setting.

## 7. Multilingual implementation

```ts
// i18n/index.ts
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi }, mr: { translation: mr } },
  lng: 'en', fallbackLng: 'en', interpolation: { escapeValue: false }
});
```
- **Static UI text** → JSON files (translate once; have the LLM draft, a human verifies).
- **Dynamic AI content** → send `lang` to the backend; the LLM writes directly in that language.
- Use a font with Devanagari support (e.g., *Noto Sans Devanagari*).
- Format currency with `Intl.NumberFormat('en-IN')` (₹1,25,000 style).
- Speech: `recognition.lang = 'mr-IN' | 'hi-IN' | 'en-IN'`.

## 8. API integration pattern

```ts
// services/api.ts
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL, timeout: 60000 });

export const generateReport = (payload: ReportRequest) =>
  api.post<FeasibilityReport>('/report/generate', payload).then(r => r.data);

// hook
export const useGenerateReport = () =>
  useMutation({ mutationFn: generateReport, onSuccess: r => useAppStore.getState().setReport(r) });
```
- Show **skeleton loaders + step messages** during long AI calls ("Analysing local market… Matching schemes…").
- Retry once on network error; show friendly fallback toast.

## 9. Charts (Recharts)

| Chart | Type | Data |
|---|---|---|
| Investment breakdown | Donut/Pie | `investment.items[]` |
| Capital vs. gap | Stacked bar | capital, gap |
| Profit projection | Line | `projection.monthly[12]` |
| Loan balance | Area | amortisation schedule |
| Risk profile | Radar | `risks.scores` |
| Feasibility score | Radial gauge | `score` |

## 10. UX for rural users
- Min tap target 48px, base font ≥ 16px, high contrast.
- Icons + short labels, avoid jargon (explain "DSCR" as "Can you repay comfortably?").
- Voice input on every free-text field.
- PWA (installable, offline-cached last report).
- Lightweight: lazy-load charts and PDF libs, compress images (WebP).
- Always show a **"Talk to advisor"** shortcut.

## 11. Testing & quality
- Vitest + React Testing Library for calculators and forms.
- Playwright for the main flow (discover → report).
- Lighthouse mobile score ≥ 85.
- Check all 3 languages for text overflow.

## 12. Suggested component checklist (build order)
1. Layout + Stepper + LanguageSwitcher
2. Questionnaire + BusinessCard
3. Profile form
4. Finance page (table, gap, EMI slider)
5. SchemeCard
6. Report renderer
7. Dashboard charts
8. Advisor drawer
9. Compare, Documents, Suppliers, CIBIL
10. PDF export, PWA, voice
