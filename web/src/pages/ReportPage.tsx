import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, Download, Loader2, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api, downloadReportAsPdf } from "@/services/api"
import { useAppStore } from "@/store/useAppStore"
import type { FeasibilityReport, InvestmentItem, Scheme } from "@/types"

import "./report/report-print.css"

const InvestmentDonut = lazy(() => import("./report/ReportCharts").then(({ InvestmentDonut: defaultExport }) => ({ default: defaultExport })))
const ProfitScenarios = lazy(() => import("./report/ReportCharts").then(({ ProfitScenarios: defaultExport }) => ({ default: defaultExport })))
const LoanBalance = lazy(() => import("./report/ReportCharts").then(({ LoanBalance: defaultExport }) => ({ default: defaultExport })))
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
const safeText = (value: unknown, fallback = "Not available") =>
  value === null || value === undefined || value === "" ? fallback : String(value)
const money = (value: unknown) => currency.format(Number(value) || 0)
const swotText = (item: unknown) => typeof item === "string" ? item : safeText((item as { text?: string })?.text)
const documentStep = (value: unknown) => {
  const text = safeText(value)
  const where = text.match(/\bat\s+(.+?)(?:;|\.|,\s*allow)/i)?.[1]
  const time = text.match(/\b(?:allow|within|takes?)\s+(.+?)(?:\s+and\s+(?:Rs\.?|₹)|;|\.)/i)?.[1]
  const cost = text.match(/(?:Rs\.?|₹)\s?[\d,]+(?:\s*(?:to|-|–)\s*(?:Rs\.?|₹)?\s?[\d,]+)?/i)?.[0]
  return { text, where: where ?? "See the application step", time: time ?? "Confirm with the issuing office", cost: cost ?? "Confirm with the issuing office" }
}

type Factor = { factor?: string; name?: string; label?: string; score?: number; value?: number; weight?: number; weighted_score?: number }
type Risk = { name?: string; severity?: string; mitigation?: string; detail?: string }

function Section({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <Card className={`report-card min-w-0 ${className}`}><CardContent className="min-w-0 p-4 sm:p-5"><h2 className="mb-3 text-base font-bold">{title}</h2>{children}</CardContent></Card>
}

function Narrative({ title, text }: { title: string; text?: string }) {
  return <Section title={title}><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{safeText(text)}</p></Section>
}

function DownloadButton({ reportId, lang }: { reportId?: string; lang: string }) {
  const { t } = useTranslation("common")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const download = async () => {
    if (!reportId) { setError(t("generate_report")); return }
    setLoading(true); setError(null)
    try {
      await downloadReportAsPdf(reportId, lang)
    } catch {
      setError(`Could not download PDF. Please try again.`)
    } finally { setLoading(false) }
  }
  return <div className="relative"><Button type="button" variant="outline" size="sm" onClick={download} disabled={loading} className="gap-2">
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{t("download_pdf")}
  </Button>{error && <p role="alert" className="absolute right-0 top-full z-10 mt-1 w-52 text-right text-xs text-destructive">{error}</p>}</div>
}

function ScorePanel({ score, t }: { score: FeasibilityReport["score"]; t: (key: string) => string }) {
  const value = Number(score?.score) || 0
  const factors: Factor[] = Array.isArray(score?.factor_scores) ? score.factor_scores : []
  return <Section title={t("feasibility_score")} className="lg:col-span-2"><div className="grid gap-5 sm:grid-cols-[120px_1fr] sm:items-center">
    <div className="mx-auto grid h-28 w-28 place-items-center rounded-full border-8 border-primary/20 bg-primary/5 text-center" aria-label={`${t("feasibility_score")} ${value} ${t("out_of_100")}`}><div><strong className="block text-3xl">{value}</strong><span className="text-xs text-muted-foreground">{t("out_of_100")}</span></div></div>
    <div><p className="mb-3 text-sm font-semibold">{safeText(score?.verdict_display ?? score?.verdict_label)}</p>{factors.length ? <div className="space-y-2">{factors.map((factor, index) => { const factorScore = Number(factor.score ?? factor.value ?? 0); const weight = Number(factor.weight ?? 0); return <div key={`${factor.factor ?? factor.name}-${index}`} className="grid grid-cols-[minmax(0,1fr)_42px] gap-3 text-xs"><div><div className="mb-1 flex justify-between gap-2"><span className="truncate">{safeText(factor.label ?? factor.factor ?? factor.name, `Factor ${index + 1}`)} <span className="text-muted-foreground">({weight || "\u2014"}%)</span></span><span>{factorScore}/100</span></div><div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: `${Math.min(100, Math.max(0, factorScore))}%` }} /></div></div><span className="self-end text-right text-muted-foreground">{safeText(factor.weighted_score, "")}</span></div> })}</div> : <p className="text-sm text-muted-foreground">{t("factor_weights_not_available")}</p>}</div>
  </div></Section>
}

function InvestmentTable({ report, t }: { report: FeasibilityReport; t: (key: string) => string }) {
  const investment = report.investment
  const items = investment?.items ?? []
  const rows = useMemo(() => {
    const mapped = items.map((item: InvestmentItem, index) => ({ name: safeText(item.name ?? item.item, `Item ${index + 1}`), value: Number(item.total) || 0 }))
    if (Number(investment?.contingency) > 0) mapped.push({ name: t("contingency"), value: Number(investment?.contingency) })
    return mapped
  }, [items, investment?.contingency, t])
  const visibleSum = rows.reduce((total, row) => total + row.value, 0)
  const total = Number(investment?.total) || 0
  return <Section title={t("investment_plan")}><p className="mb-3 text-sm text-muted-foreground">{safeText(report.narrative?.investment_summary)}</p><div className="overflow-x-auto"><table className="w-full min-w-[320px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2">{t("item")}</th><th className="pb-2 text-right">{t("amount")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name} className="border-b border-border/60"><td className="py-2">{row.name}</td><td className="py-2 text-right font-medium">{money(row.value)}</td></tr>)}<tr className="border-t-2"><td className="pt-3 font-bold">{t("visible_items_sum")}</td><td className="pt-3 text-right font-bold">{money(visibleSum)}</td></tr><tr><td className="pt-2 font-bold">{t("computed_total")}</td><td className="pt-2 text-right font-bold">{money(total)}</td></tr></tbody></table></div>{visibleSum !== total && <p className="mt-2 text-xs text-amber-700">{t("item_values_total")} {money(visibleSum)}; {t("computed_total_is")} {money(total)}.</p>}</Section>
}

function SchemeCards({ schemes, explanations, t }: { schemes: Scheme[]; explanations?: Record<string, string>; t: (key: string) => string }) {
  return <Section title={t("funding_and_schemes")}><div className="space-y-3">{schemes.length ? schemes.map((scheme, index) => { const recommended = Boolean((scheme as any).recommended) || index === 0; const key = scheme.scheme_id ?? scheme.id ?? String(index); return <article key={key} className="rounded-lg border p-3"><div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="font-semibold">{safeText(scheme.scheme_name ?? scheme.name)}</h3>{recommended && <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{t("recommended")}</span>}</div><p className="mb-2 text-sm text-muted-foreground">{safeText(explanations?.[key] ?? scheme.benefits ?? scheme.reasons?.join("; "))}</p><dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs"><div><dt className="text-muted-foreground">{t("subsidy")}</dt><dd>{scheme.subsidy_pct != null ? `${scheme.subsidy_pct}%` : safeText(scheme.subsidy)}</dd></div><div><dt className="text-muted-foreground">{t("interest")}</dt><dd>{safeText(scheme.interest_range)}</dd></div><div><dt className="text-muted-foreground">{t("collateral")}</dt><dd>{scheme.collateral_required != null ? (scheme.collateral_required ? t("required") : t("not_required")) : safeText(scheme.collateral)}</dd></div></dl><div className="mt-3"><p className="mb-1 text-xs font-semibold">{t("application_steps")}</p><ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">{(scheme.how_to_apply ?? []).slice(0, 3).map((step, stepIndex) => <li key={stepIndex}>{safeText(step)}</li>)}</ol></div>{scheme.source_url && <a className="mt-3 inline-block break-all text-xs font-medium text-primary underline" href={scheme.source_url} target="_blank" rel="noreferrer">{t("official_source")}</a>}</article> }) : <p className="text-sm text-muted-foreground">{t("no_scheme_available")}</p>}</div></Section>
}

export function ReportPage() {
  const navigate = useNavigate()
  const { profile, idea, lang, report, setReport } = useAppStore()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generate = useCallback(async () => { setLoading(true); setError(null); try { const response = await api.post("/report/generate", { profile, idea, lang, loan_amount: Math.max(0, 286000 - (profile.capital || 0)), loan_rate: 10.5, loan_tenure_months: 60, moratorium_months: 3 }); setReport(response.data) } catch { setError(t("error") + " " + t("retry")) } finally { setLoading(false) } }, [profile, idea, lang, setReport, t])
  useEffect(() => { if (!report) void generate() }, [report, generate])
  const data = report as FeasibilityReport | null
  const investmentData = useMemo(() => { const investment = data?.investment; const rows = (investment?.items ?? []).map((item, index) => ({ name: safeText(item.name ?? item.item, `Item ${index + 1}`), value: Number(item.total) || 0 })); if (Number(investment?.contingency) > 0) rows.push({ name: t("contingency"), value: Number(investment?.contingency) }); return rows }, [data?.investment, t])
  const projection = data?.projection as any
  const monthly = (projection?.monthly ?? []).map((row: any, index: number) => ({ month: row.month ?? index + 1, base: Number(row.net_profit ?? row.profit ?? 0), optimistic: Number(projection?.optimistic_monthly?.[index]?.net_profit ?? row.optimistic_net_profit ?? row.net_profit ?? row.profit ?? 0) * (projection?.optimistic_monthly ? 1 : 1.15), downside: Number(projection?.pessimistic_monthly?.[index]?.net_profit ?? row.downside_net_profit ?? row.net_profit ?? row.profit ?? 0) * (projection?.pessimistic_monthly ? 1 : 0.8) }))
  const balance = (data?.repayment?.schedule ?? []).map((row: any, index: number) => ({ month: row.month ?? index + 1, balance: Number(row.balance ?? row.closing_balance ?? 0) }))
  const risks: Risk[] = data?.local_data?.risks ?? data?.market?.risks ?? []
  const factors = data?.score?.factor_scores ?? []
  const creditActions = data?.credit?.actions ?? []
  const reportId = data?.report_id ?? data?.id
  const reportProfile = data?.profile ?? profile
  if (!data && loading) return <main className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>
  if (!data) return <main className="mx-auto max-w-xl p-6"><Section title={t("report_unavailable")}><p className="text-sm text-muted-foreground">{error ?? t("no_report_yet")}</p><Button className="mt-4" onClick={generate}>{t("generate_report")}</Button></Section></main>
  return <main className="report-page mx-auto min-w-0 max-w-6xl space-y-5 px-3 py-5 sm:px-6"><header className="report-header flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">GramUdyam AI</p><h1 className="text-2xl font-bold">{t("report_header")}</h1><p className="text-sm text-muted-foreground">{safeText(data.idea?.business_type ?? idea?.business_type)} \u00b7 {safeText(reportProfile.district)}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={generate} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}{t("regenerate")}</Button><DownloadButton reportId={reportId} lang={lang} /><Button size="sm" variant="outline" onClick={() => navigate("/dashboard")}>{t("report.dashboard", "View Dashboard")}</Button></div></header>
    {error && <p role="alert" className="flex gap-2 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />{error}</p>}
    {data.narrative_source === "fallback" && <p className="rounded border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-900">{t("ai_summary_unavailable")}</p>}
    <div className="flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${data.data_confidence === "high" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{t("data_confidence")}: {safeText(data.data_confidence)}</span>{[...(data.warnings ?? []), ...((data.score as any)?.plausibility_warnings ?? []).map((message: string) => ({ message }))].map((warning, index) => <span key={`${warning.code}-${index}`} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-900">{safeText(warning.message ?? warning.code)}</span>)}</div>
    <Section title={t("data_at_a_glance")}><dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-xs text-muted-foreground">{t("market")}</dt><dd>{safeText(data.local_data?.nearest_market)}, {safeText(data.local_data?.distance_to_market_km)} km</dd></div><div><dt className="text-xs text-muted-foreground">{t("funding_gap")}</dt><dd>{money(data.gap?.gap)} of {money(data.gap?.total_investment)}</dd></div><div><dt className="text-xs text-muted-foreground">{t("annual_base_projection")}</dt><dd>{money(projection?.annual_net_profit)} profit</dd></div><div><dt className="text-xs text-muted-foreground">{t("credit_readiness")}</dt><dd>{safeText((data.credit as any)?.bucket_label ?? data.credit?.bucket)}</dd></div><div><dt className="text-xs text-muted-foreground">{t("rate_source")}</dt><dd>{safeText(data.rate_source)}</dd></div><div><dt className="text-xs text-muted-foreground">{t("alternatives")}</dt><dd>{safeText((data.credit as any)?.alternative_routes?.join(", ") ?? data.fallback_options?.join(", "))}</dd></div><div><dt className="text-xs text-muted-foreground">{t("report_date")}</dt><dd>{safeText(data.created_at)}</dd></div><div><dt className="text-xs text-muted-foreground">{t("saved")}</dt><dd>{data.saved === false ? t("not_saved") : t("saved")}</dd></div></dl></Section>
    <section className="grid gap-4 lg:grid-cols-2"><ScorePanel score={data.score} t={t} /><Narrative title={t("executive_summary")} text={data.narrative?.verdict_summary} /><Narrative title={t("market_analysis")} text={data.narrative?.market_summary} /><InvestmentTable report={data} t={t} /><SchemeCards schemes={data.schemes ?? []} explanations={data.narrative?.scheme_explanations} t={t} /><Narrative title={t("loan_repayment")} text={data.narrative?.repayment_summary} /><Narrative title={t("break_even")} text={data.narrative?.break_even_summary} /></section>
    {Object.keys(data.narrative?.slide_titles ?? {}).length > 0 && <Section title={t("presentation_takeaways")}><ul className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries(data.narrative?.slide_titles ?? {}).map(([slide, takeaway]) => <li key={slide} className="rounded border p-3"><span className="mr-2 text-xs font-semibold uppercase text-primary">{slide.replaceAll("_", " ")}</span>{safeText(takeaway)}</li>)}</ul></Section>}
    <section className="grid gap-4 lg:grid-cols-3"><Suspense fallback={<Section title={t("charts")}><p className="text-sm text-muted-foreground">{t("loading_chart")}</p></Section>}><Section title={t("investment_mix")}><InvestmentDonut data={investmentData} /></Section><Section title={t("profit_scenarios")}><ProfitScenarios data={monthly} /></Section><Section title={t("loan_balance")}><LoanBalance data={balance} /></Section></Suspense></section>
    <section className="grid gap-4 lg:grid-cols-2"><Section title={t("risk_and_mitigation")}><p className="mb-3 text-sm text-muted-foreground">{safeText(data.narrative?.risk_summary)}</p><div className="overflow-x-auto"><table className="w-full min-w-[360px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2">{t("risk")}</th><th className="pb-2">{t("severity")}</th><th className="pb-2">{t("mitigation")}</th></tr></thead><tbody>{risks.map((risk, index) => <tr key={`${risk.name}-${index}`} className="border-b border-border/60"><td className="py-2">{safeText(risk.name)}</td><td className="py-2"><span className="rounded bg-muted px-2 py-1 text-xs">{safeText(risk.severity)}</span></td><td className="py-2 text-muted-foreground">{safeText(risk.mitigation ?? risk.detail)}</td></tr>)}</tbody></table></div></Section><Section title={t("credit_plan")}><div className="grid gap-3 sm:grid-cols-3">{[30, 60, 90].map((days, index) => <div key={days} className="rounded border p-3"><p className="font-bold">{days} {t("days")}</p><p className="mt-1 text-sm text-muted-foreground">{safeText(creditActions[index]?.action ?? creditActions[index]?.description ?? data.credit?.alternatives?.[index], t("credit_action_not_available"))}</p></div>)}</div></Section></section>
    <section className="grid gap-4 lg:grid-cols-2"><Section title={t("recommendations")}><ol className="space-y-2">{(data.narrative?.recommendations ?? []).map((item, index) => <li key={index} className="flex gap-2 text-sm"><span className="font-bold text-primary">{index + 1}.</span>{safeText(item)}</li>)}</ol></Section><Section title={t("document_next_steps")}><div className="space-y-3">{(data.narrative?.next_steps ?? []).map((step, index) => { const details = documentStep(step); return <article key={index} className="rounded border p-3"><p className="font-medium">{t("step")} {index + 1}</p><p className="mt-1 text-sm text-muted-foreground">{details.text}</p><dl className="mt-2 grid gap-2 text-xs sm:grid-cols-3"><div><dt className="font-semibold">{t("where")}</dt><dd className="text-muted-foreground">{details.where}</dd></div><div><dt className="font-semibold">{t("approx_time")}</dt><dd className="text-muted-foreground">{details.time}</dd></div><div><dt className="font-semibold">{t("approx_cost")}</dt><dd className="text-muted-foreground">{details.cost}</dd></div></dl></article> })}</div></Section></section>
    <section className="grid gap-4 lg:grid-cols-2"><Narrative title={t("funding_summary")} text={data.narrative?.funding_summary} /><Section title={t("swot_evidence")}><div className="grid gap-3 sm:grid-cols-2">{Object.entries(data.narrative?.swot ?? {}).map(([label, items]) => <div key={label} className="rounded border p-3"><h3 className="mb-2 capitalize font-semibold">{t(label as "strengths" | "weaknesses" | "opportunities" | "threats")}</h3><ul className="space-y-2 text-sm text-muted-foreground">{items.map((item: any, index: number) => <li key={index}>{swotText(item)}{typeof item !== "string" && item.evidence_key && <small className="mt-1 block text-xs text-primary">{t("evidence")}: {item.evidence_key}</small>}</li>)}</ul></div>)}</div></Section></section>
    <footer className="report-card rounded border p-4 text-xs text-muted-foreground"><b className="block text-foreground">{t("advisory_disclaimer")}</b>{safeText(data.narrative?.disclaimer)}</footer>
  </main>
}