import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 360, height: 740 }, isMobile: false, hasTouch: false })

const report = {
  report_id: "mobile-report",
  profile: { name: "Sunita", state: "Maharashtra", district: "Nashik", village: "Sinnar", capital: 50000, category: "obc", gender: "f", age: 31, experience: "some", collateral: false },
  idea: { business_type: "Spice grinding", scale: "micro", details: "Turmeric and chilli powders" },
  narrative_source: "llm",
  data_confidence: "medium",
  warnings: [{ message: "Figures are estimates." }],
  local_data: { nearest_market: "Nashik APMC", distance_to_market_km: 18, risks: [{ name: "Raw material prices", severity: "Medium", mitigation: "Get quarterly quotes." }] },
  investment: { total: 120000, fixed_cost: 80000, working_capital: 30000, contingency: 10000, items: [{ item: "Grinder", unit: "unit", unit_cost: 50000, quantity: 1, total: 50000 }, { item: "Packaging", unit: "lot", unit_cost: 30000, quantity: 1, total: 30000 }, { item: "Working capital", unit: "month", unit_cost: 30000, quantity: 1, total: 30000 }] },
  gap: { total_investment: 120000, available_capital: 50000, gap: 70000, capital_ratio: 0.42, is_self_funded: false },
  schemes: [{ scheme_id: "pmegp", scheme_name: "PMEGP", eligible: "yes", reasons: ["Micro enterprise"], subsidy_pct: 25, interest_range: "8%–10%", collateral_required: false, how_to_apply: ["Register", "Upload documents", "Meet bank"], source_url: "https://kviconline.gov.in", recommended: true }],
  projection: { annual_revenue: 360000, annual_net_profit: 96000, monthly: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, net_profit: 8000 })) },
  repayment: { emi: 1800, schedule: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, closing_balance: 70000 - index * 5000 })) },
  credit: { bucket: "fair", bucket_label: "Fair readiness", actions: [{ action: "Open a current account", timeline: "30_days" }, { action: "Keep invoices", timeline: "60_days" }, { action: "Apply for credit", timeline: "90_days" }], alternative_routes: ["Self-help group loan"] },
  score: { score: 72, verdict_display: "Feasible with conditions", factor_scores: [{ factor: "Market fit", score: 75, weight: 35, weighted_score: 26.25 }] },
  narrative: { verdict_summary: "Nashik spice grinding scores 72/100 with a ₹1,20,000 investment.", market_summary: "Nashik APMC is 18 km away and the figures are estimates.", investment_summary: "A ₹50,000 grinder and ₹10,000 contingency are included.", funding_summary: "The ₹70,000 gap can use PMEGP's 25% subsidy.", scheme_explanations: { pmegp: "PMEGP provides a 25% subsidy." }, repayment_summary: "The ₹1,800 EMI follows the PMEGP application.", break_even_summary: "Break-even is estimated after the first year.", risk_summary: "Raw material prices are a medium risk.", swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }, recommendations: ["Apply within 30 days.", "Reserve ₹10,000.", "Collect quotes in 14 days."], next_steps: ["Apply for FSSAI registration at the FoSCoS portal; allow 7-60 days and Rs. 100-7,500."], disclaimer: "Confirm estimates with the lender." },
}

for (const lang of ["en", "hi", "mr"]) {
  test(`report has no horizontal overflow at 360px in ${lang}`, async ({ page }) => {
    await page.addInitScript(({ savedReport, language }) => {
      localStorage.setItem("gramudyam-storage", JSON.stringify({ state: { lang: language, theme: "light", activeUserId: null, profile: savedReport.profile, idea: savedReport.idea, report: savedReport, compareList: [] }, version: 0 }))
    }, { savedReport: report, language: lang })

    await page.goto("/report")
    await expect(page.getByRole("heading", { name: "Business feasibility report" })).toBeVisible()
    await expect(page.getByText("Visible items sum")).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  })
}
