import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ReportPage } from "./ReportPage"
import { useAppStore } from "@/store/useAppStore"
import { api, downloadReportAsPdf } from "@/services/api"
import type { FeasibilityReport } from "@/types"

vi.mock("@/services/api", () => ({ api: { get: vi.fn(), post: vi.fn() }, downloadReportAsPdf: vi.fn() }))
vi.mock("./report/ReportCharts", () => ({
  InvestmentDonut: () => <div data-testid="investment-chart" />,
  ProfitScenarios: () => <div data-testid="profit-chart" />,
  LoanBalance: () => <div data-testid="loan-chart" />,
}))

const testI18n = i18n.createInstance()

testI18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  initImmediate: false,
  resources: {
    en: {
      translation: {
        app_name: "GramUdyam AI",
        common: {
          next: "Next",
          back: "Back",
          submit: "Submit",
          loading: "Loading...",
          error: "Something went wrong",
          retry: "Try Again",
          download_pdf: "Download PDF",
          compare: "Compare",
          select: "Select",
          search: "Search",
          filter: "Filter",
          close: "Close",
          save: "Save",
          cancel: "Cancel",
          download_pptx: "Download PowerPoint",
        },
        report_header: "Business feasibility report",
        regenerate: "Regenerate",
        download_pdf: "Download PDF",
        download_pptx: "Download PowerPoint",
        dashboard: "Dashboard",
        data_at_a_glance: "Report data at a glance",
        market: "Market",
        funding_gap: "Funding gap",
        annual_base_projection: "Annual base projection",
        credit_readiness: "Credit readiness",
        rate_source: "Rate source",
        alternatives: "Alternatives",
        report_date: "Report date",
        saved: "Saved",
        not_saved: "Not saved",
        data_confidence: "Data confidence",
        feasibility_score: "Feasibility score",
        out_of_100: "out of 100",
        executive_summary: "Executive summary",
        investment_plan: "Investment plan",
        investment_mix: "Investment mix",
        funding_and_schemes: "Funding and schemes",
        loan_repayment: "Loan repayment",
        profit_scenarios: "12-month profit scenarios",
        loan_balance: "Loan balance",
        risk_and_mitigation: "Risk and mitigation",
        credit_plan: "30 / 60 / 90-day credit plan",
        days: "days",
        presentation_takeaways: "Presentation takeaways",
        document_next_steps: "Document next steps",
        step: "Step",
        where: "Where",
        approx_time: "Approx. time",
        approx_cost: "Approx. cost",
        recommended: "Recommended",
        subsidy: "Subsidy",
        interest: "Interest",
        collateral: "Collateral",
        application_steps: "Application steps",
        official_source: "Official source",
        severity: "Severity",
        mitigation: "Mitigation",
        action: "Action",
        funding_summary: "Funding summary",
        swot_evidence: "SWOT evidence",
        strengths: "Strengths",
        weaknesses: "Weaknesses",
        opportunities: "Opportunities",
        threats: "Threats",
        evidence: "Evidence",
        advisory_disclaimer: "Advisory disclaimer",
        item: "Item",
        amount: "Amount",
        visible_items_sum: "Visible items sum",
        computed_total: "Computed total",
        contingency: "Contingency",
        total_investment: "Total Investment",
        available_capital: "Available Capital",
        gap: "Gap",
        no_scheme_available: "No matched scheme is available.",
        no_report_yet: "No report is available yet.",
        generate_report: "Generate report",
        report_unavailable: "Report unavailable",
        ai_summary_unavailable: "AI summary was unavailable, showing a basic summary.",
        loading_chart: "Loading chart...",
        credit_action_not_available: "Credit action not available",
        factor_weights_not_available: "Factor weights are not available in this report.",
        item_values_total: "Item values total",
        computed_total_is: "computed total is",
        required: "Required",
        not_required: "Not required",
        charts: "Charts",
        risk: "Risk",
        language: {
          select: "Choose Language",
          en: "English",
          hi: "हिन्दी",
          mr: "मराठी",
        },
      },
      common: {
        next: "Next",
        back: "Back",
        submit: "Submit",
        loading: "Loading...",
        error: "Something went wrong",
        retry: "Try Again",
        download_pdf: "Download PDF",
        compare: "Compare",
        select: "Select",
        search: "Search",
        filter: "Filter",
        close: "Close",
        save: "Save",
        cancel: "Cancel",
        download_pptx: "Download PowerPoint",
      },
    },
  },
})

testI18n.init()

// Wait for i18n to be ready
await testI18n.init()

const fullReport: FeasibilityReport = {
  report_id: "sunita-report",
  profile: { name: "Sunita", state: "Maharashtra", district: "Nashik", village: "Sinnar", capital: 50000, category: "obc", gender: "f", age: 31, experience: "some", collateral: false },
  idea: { business_type: "Spice grinding", scale: "micro", details: "Turmeric and chilli powders" },
  narrative_source: "llm",
  data_confidence: "medium",
  warnings: [{ code: "optimistic_assumptions", message: "Sales figures are estimates because the data confidence is medium." }],
  local_data: { nearest_market: "Nashik APMC", distance_to_market_km: 18, risks: [{ name: "Raw material price volatility", severity: "Medium", mitigation: "Lock supplier prices quarterly." }] },
  investment: { total: 120000, fixed_cost: 80000, working_capital: 30000, contingency: 10000, items: [{ item: "Grinder", unit_cost: 50000, unit: "unit", quantity: 1, total: 50000 }, { item: "Packaging", unit_cost: 30000, unit: "lot", quantity: 1, total: 30000 }, { item: "Working capital", unit_cost: 30000, unit: "month", quantity: 1, total: 30000 }] },
  gap: { total_investment: 120000, available_capital: 50000, gap: 70000, capital_ratio: 0.42 },
  schemes: [{ scheme_id: "pmegp", scheme_name: "PMEGP", eligible: "yes", reasons: ["Women entrepreneur", "Micro enterprise"], subsidy_pct: 25, interest_range: "8%–10%", collateral_required: false, how_to_apply: ["Register on the PMEGP portal", "Upload Aadhaar and project report", "Attend bank interview"], source_url: "https://kviconline.gov.in" }],
  projection: { annual_revenue: 360000, annual_net_profit: 96000, monthly: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, net_profit: 8000, revenue: 30000 })), optimistic_monthly: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, net_profit: 10000 })), pessimistic_monthly: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, net_profit: 5000 })) } as any,
  repayment: { emi: 1800, total_interest: 8000, schedule: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, closing_balance: 70000 - index * 5000 })) } as any,
  credit: { bucket: "fair", bucket_label: "Fair readiness", actions: [{ action: "Open a current account", timeline: "30_days", priority: "high" }, { action: "Keep invoices for 60 days", timeline: "60_days", priority: "medium" }, { action: "Apply after 90 days", timeline: "90_days", priority: "medium" }], alternative_routes: ["Self-help group loan"] } as any,
  score: { score: 72, verdict_display: "Feasible with conditions", factor_scores: [{ factor: "Market fit", score: 75, weight: 35, weighted_score: 26.25 }, { factor: "Capital", score: 65, weight: 30, weighted_score: 19.5 }], plausibility_warnings: ["weak_downside"] },
  rate_source: "PMEGP indicative rate",
  fallback_options: ["MUDRA"],
  saved: true,
  created_at: "2026-10-12",
  narrative: {
    verdict_summary: "Sunita's Nashik spice unit scores 72/100 with a ₹1,20,000 investment.",
    market_summary: "Nashik APMC is 18 km away and the figures are estimates.",
    investment_summary: "The ₹50,000 grinder, ₹30,000 packaging and ₹10,000 contingency total ₹1,20,000.",
    funding_summary: "The ₹70,000 funding gap can use PMEGP's 25% subsidy.",
    scheme_explanations: { pmegp: "PMEGP supports Sunita with 25% subsidy and an 8%–10% rate." },
    repayment_summary: "A ₹1,800 EMI is planned after the PMEGP loan.",
    break_even_summary: "At ₹8,000 monthly profit, the estimated break-even is in month 12.",
    risk_summary: "Raw material prices are a medium risk; lock supplier prices quarterly.",
    swot: { strengths: [{ text: "₹50,000 own capital supports the ₹1,20,000 plan.", evidence_key: "gap.available_capital" }], weaknesses: [], opportunities: [{ text: "PMEGP offers a 25% subsidy.", evidence_key: "schemes[0].subsidy_pct" }], threats: [{ text: "Raw material price volatility is medium severity.", evidence_key: "local_data.risks[0]" }] },
    recommendations: ["Apply for the ₹70,000 PMEGP gap within 30 days.", "Reserve the ₹10,000 contingency before month 1.", "Collect supplier quotes within 14 days."],
    next_steps: ["Apply for FSSAI registration at the FoSCoS portal; allow 7-60 days and Rs. 100-7,500.", "Open a current account at the nearest bank; allow 1-3 days and Rs. 0."],
    slide_titles: { investment: "The ₹1,20,000 plan includes a ₹10,000 contingency reserve." },
    disclaimer: "Estimates are advisory and should be confirmed with the lender.",
  },
}

function renderPage(report: FeasibilityReport, language = "en") {
  useAppStore.setState({ report, lang: language, profile: fullReport.profile!, idea: fullReport.idea })
  return render(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter>
        <ReportPage />
      </MemoryRouter>
    </I18nextProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperties(URL, {
    createObjectURL: { configurable: true, value: vi.fn(() => "blob:report") },
    revokeObjectURL: { configurable: true, value: vi.fn() },
  })
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
})

describe("ReportPage", () => {
  it("renders the full report payload without null or undefined text", async () => {
    renderPage(fullReport)

    await waitFor(() => {
      expect(screen.queryByText("AI summary was unavailable, showing a basic summary.")).not.toBeInTheDocument()
    })
    expect(screen.getByText("Visible items sum")).toBeInTheDocument()
    expect(screen.getAllByText("₹1,20,000").length).toBeGreaterThan(0)
    expect(screen.getByText("Recommended")).toBeInTheDocument()
    expect(screen.getByText("PMEGP")).toBeInTheDocument()
    expect(screen.getByText("30 days")).toBeInTheDocument()
    expect(screen.getAllByText(/FoSCoS portal/).length).toBeGreaterThan(0)
    expect(screen.getByText("Evidence: gap.available_capital")).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\b(?:undefined|null)\b/i)
  })

  it("shows the fallback notice for a fallback narrative", async () => {
    renderPage({ ...fullReport, narrative_source: "fallback" })

    await waitFor(() => {
      expect(screen.getByText("AI summary was unavailable, showing a basic summary.")).toBeInTheDocument()
    })
  })

  it("downloads PDF file", async () => {
    ;(downloadReportAsPdf as any).mockResolvedValue(undefined)
    renderPage(fullReport)

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: "Download PDF" }))
      expect(downloadReportAsPdf).toHaveBeenCalledWith("sunita-report", "en")
    })
  })
})