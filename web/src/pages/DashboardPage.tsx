import React from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { BarChart2, ArrowRight } from "lucide-react"

const DONUT_COLORS = ["#15803d", "#8c6a53", "#d97706", "#166534", "#a98468", "#2563eb", "#9333ea"]

// ---------------------------------------------------------------------------
// Empty-state card shown when a specific data section has no report data yet
// ---------------------------------------------------------------------------
function EmptyChartCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="h-52 w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20">
      <BarChart2 className="w-7 h-7 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground text-center px-4">{hint}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Prompt shown when there is no report at all
// ---------------------------------------------------------------------------
function NoReportCTA() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
      <BarChart2 className="w-14 h-14 text-muted-foreground/30" />
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-lg font-bold text-foreground">{t("dashboard.no_report_title", { defaultValue: "No Plan Data Yet" })}</h3>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.no_report_hint", {
            defaultValue:
              "Complete the Discovery → Profile → Finance → Report flow so the dashboard can populate all six charts with your live business plan numbers.",
          })}
        </p>
      </div>
      <Button onClick={() => navigate("/discover")} className="flex items-center gap-2 font-semibold">
        <span>{t("dashboard.start_cta", { defaultValue: "Start Business Discovery" })}</span>
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { report, profile, idea } = useAppStore()

  // ── 1. Investment Breakdown (Donut) ── fully dynamic from report ─────────
  const donutData = React.useMemo(() => {
    if (!report?.investment?.items?.length) return null
    return report.investment.items.map((item: any, index: number) => ({
      name: item.item || item.name || `Item ${index + 1}`,
      value: item.total ?? item.line_total ?? 0,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    }))
  }, [report])

  // ── 2. Capital vs Gap (Stacked Bar) ── dynamic from report.gap ───────────
  const capitalBarData = React.useMemo(() => {
    if (!report?.gap) return null
    const own = report.gap.available_capital ?? profile.capital ?? 0
    const gap = report.gap.gap ?? 0
    return {
      chartData: [{ category: "Funding Outlay", OwnCapital: own, SchemeLoan: gap }],
      userCapital: own,
      schemeLoan: gap,
      total: own + gap,
    }
  }, [report, profile.capital])

  // ── 3. 12-Month Net Profit Projection (Line) ── dynamic from report ──────
  const profitData = React.useMemo(() => {
    const monthly = report?.projection?.monthly
    if (!monthly || !Array.isArray(monthly) || monthly.length === 0) return null
    return monthly.map((m: any, i: number) => ({
      month: `M${m.month ?? i + 1}`,
      profit: Math.round(m.net_profit ?? (typeof m === "number" ? m : 0)),
    }))
  }, [report])

  // ── 4. Loan Amortization Balance (Area) ── dynamic from report.repayment ─
  const loanBalanceData = React.useMemo(() => {
    const sched = report?.repayment?.schedule
    if (!sched || sched.length === 0) return null
    const loanAmt = report.repayment?.loan_amount ?? report.gap?.gap ?? 0
    const points: { month: string; balance: number }[] = [
      { month: "Start", balance: Math.round(loanAmt) },
    ]
    const step = Math.max(1, Math.floor(sched.length / 6))
    for (let i = step - 1; i < sched.length; i += step) {
      points.push({
        month: `${sched[i].month}M`,
        balance: Math.round(sched[i].closing_balance ?? sched[i].balance ?? 0),
      })
    }
    const last = sched[sched.length - 1]
    if (points[points.length - 1].month !== `${last.month}M`) {
      points.push({ month: `${last.month}M`, balance: Math.round(last.closing_balance ?? 0) })
    }
    return points
  }, [report])

  // ── 5. Risk Radar ── dynamic from report.score.factor_scores ─────────────
  const riskRadarData = React.useMemo(() => {
    const fs = report?.score?.factor_scores
    if (!fs) return null
    if (Array.isArray(fs)) {
      return fs.map((item: any) => ({
        subject: (item.factor || "Factor").charAt(0).toUpperCase() + (item.factor || "Factor").slice(1),
        score: Math.round(item.score || 0),
      }))
    }
    return Object.entries(fs).map(([k, v]) => ({
      subject: k.charAt(0).toUpperCase() + k.slice(1),
      score: Math.round(Number(v) || 0),
    }))
  }, [report])

  // ── 6. Overall Feasibility Score ─────────────────────────────────────────
  const scoreValue = report?.score?.score != null ? Math.round(report.score.score) : null
  const verdictRaw = report?.score?.verdict_display || report?.score?.verdict_label || ""
  const formattedVerdict = verdictRaw.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())

  const enterpriseName =
    idea?.business_type || (profile.district ? `${profile.district} Rural Enterprise` : "Enterprise")

  // No report at all → full-page CTA
  if (!report) return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t("dashboard.title")} & Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your plan analytics will appear here after you generate a feasibility report.
        </p>
      </div>
      <NoReportCTA />
    </div>
  )

  const ownPct = capitalBarData ? Math.round((capitalBarData.userCapital / Math.max(1, capitalBarData.total)) * 100) : 0
  const loanPct = 100 - ownPct

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-foreground">
            {t("dashboard.title")} & Analytics
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
            Live Plan Data
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {enterpriseName}: capital structure, projected margins, loan amortization, and risk distribution.
        </p>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 1. Donut: Investment Breakdown */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">{t("dashboard.investment_breakdown")}</h3>
            {donutData ? (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), "Amount"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground justify-center">
                  {donutData.map((d, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChartCard title="" hint="Investment breakdown populates once report items are generated." />
            )}
          </CardContent>
        </Card>

        {/* 2. Stacked Bar: Capital vs Gap */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">{t("dashboard.capital_vs_gap")}</h3>
            {capitalBarData ? (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capitalBarData.chartData} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `₹${v / 1000}k`} />
                      <YAxis type="category" dataKey="category" hide />
                      <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                      <Bar dataKey="OwnCapital" stackId="a" fill="#15803d" name="Own Capital" />
                      <Bar dataKey="SchemeLoan" stackId="a" fill="#d97706" name="Loan / Gap" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs" /> Savings: {formatCurrency(capitalBarData.userCapital)} ({ownPct}%)
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <span className="w-2.5 h-2.5 bg-amber-600 rounded-xs" /> Loan: {formatCurrency(capitalBarData.schemeLoan)} ({loanPct}%)
                  </span>
                </div>
              </>
            ) : (
              <EmptyChartCard title="" hint="Capital vs funding gap chart appears after report generation." />
            )}
          </CardContent>
        </Card>

        {/* 3. Line Chart: 12-Month Net Profit Projection */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">{t("dashboard.profit_projection")}</h3>
            {profitData ? (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={profitData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                      <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                      <Line type="monotone" dataKey="profit" stroke="#15803d" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] text-center text-muted-foreground">
                  {report.projection?.annual_net_profit
                    ? `Total 12-Month Projected Profit: ${formatCurrency(report.projection.annual_net_profit)}`
                    : "Monthly net margin across Year 1."}
                </div>
              </>
            ) : (
              <EmptyChartCard title="" hint="Monthly profit projection populates after the report pipeline runs." />
            )}
          </CardContent>
        </Card>

        {/* 4. Area Chart: Loan Balance Over Months */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">{t("dashboard.loan_balance")}</h3>
            {loanBalanceData ? (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={loanBalanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                      <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                      <Area type="monotone" dataKey="balance" stroke="#8c6a53" fill="#dfd3c3" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] text-center text-muted-foreground">
                  {report.repayment?.emi
                    ? `Monthly installment: ${formatCurrency(report.repayment.emi)}/month`
                    : "Amortized debt payoff schedule."}
                </div>
              </>
            ) : (
              <EmptyChartCard title="" hint="Loan amortization schedule requires a report with loan/repayment data." />
            )}
          </CardContent>
        </Card>

        {/* 5. Radar Chart: Feasibility Factor Scores */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">{t("dashboard.risk_profile")} (Radar)</h3>
            {riskRadarData ? (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={riskRadarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                      <Radar name="Score" dataKey="score" stroke="#15803d" fill="#15803d" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] text-center text-muted-foreground">
                  Multi-factor readiness evaluation across financial & market dimensions.
                </div>
              </>
            ) : (
              <EmptyChartCard title="" hint="Factor-score radar chart requires a full feasibility report with scoring data." />
            )}
          </CardContent>
        </Card>

        {/* 6. Score Radial Indicator */}
        <Card className="border-border flex flex-col justify-between p-5">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-foreground">{t("dashboard.feasibility_score")}</h3>
            <p className="text-xs text-muted-foreground">Weighted decision matrix rating</p>
          </div>

          {scoreValue != null ? (
            <>
              <div className="py-6 flex flex-col items-center justify-center">
                <div className="w-28 h-28 rounded-xl border-4 border-primary/40 bg-secondary/40 flex flex-col items-center justify-center shadow-xs">
                  <span className="text-3xl font-black text-primary">{scoreValue}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Out of 100</span>
                </div>
                {formattedVerdict && (
                  <span className="mt-3 text-xs font-bold px-3 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-md text-center">
                    {formattedVerdict}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground text-center">
                {report.repayment?.dscr != null
                  ? `DSCR: ${report.repayment.dscr.toFixed(2)} (${report.repayment.affordable ? "Bankable" : "Tight Debt Service"})`
                  : "Meets standard bankable threshold under MSME scheme criteria."}
              </div>
            </>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center gap-3">
              <div className="w-28 h-28 rounded-xl border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center">
                <BarChart2 className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-xs text-muted-foreground text-center px-2">Score appears after report generation.</p>
              <Button size="sm" variant="outline" onClick={() => navigate("/report")} className="text-xs">
                Generate Report →
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
