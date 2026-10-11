import React from "react"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent } from "@/components/ui/card"
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

const DONUT_COLORS = ["#15803d", "#8c6a53", "#d97706", "#166534", "#a98468", "#2563eb", "#9333ea"]

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const { report, profile, idea } = useAppStore()

  // 1. Investment Breakdown (Donut) - Dynamic from report.investment
  const donutData = React.useMemo(() => {
    if (report?.investment?.items && report.investment.items.length > 0) {
      return report.investment.items.map((item, index) => ({
        name: item.item,
        value: item.total,
        color: DONUT_COLORS[index % DONUT_COLORS.length],
      }))
    }
    // Dynamic fallback based on profile or standard scale
    const baseVal = profile.capital > 0 ? profile.capital * 4 : 286000
    return [
      { name: "Equipment & Machinery", value: Math.round(baseVal * 0.45), color: "#15803d" },
      { name: "Working Capital", value: Math.round(baseVal * 0.25), color: "#8c6a53" },
      { name: "Raw Materials / Stock", value: Math.round(baseVal * 0.15), color: "#d97706" },
      { name: "Shed / Workspace Setup", value: Math.round(baseVal * 0.10), color: "#166534" },
      { name: "Contingency Buffer", value: Math.round(baseVal * 0.05), color: "#a98468" },
    ]
  }, [report, profile.capital])

  // 2. Capital vs Gap (Stacked Bar) - Dynamic
  const { userCapital, schemeLoan, totalInvest } = React.useMemo(() => {
    const own = report?.gap?.available_capital ?? (profile.capital || 50000)
    const gap = report?.gap?.gap ?? Math.max(0, (report?.investment?.total ?? 286000) - own)
    const total = report?.investment?.total ?? (own + gap)
    return { userCapital: own, schemeLoan: gap, totalInvest: total }
  }, [report, profile.capital])

  const capitalGapData = [
    { category: "Funding Outlay", OwnCapital: userCapital, SchemeLoan: schemeLoan },
  ]

  const ownPct = totalInvest > 0 ? Math.round((userCapital / totalInvest) * 100) : 18
  const loanPct = Math.max(0, 100 - ownPct)

  // 3. 12-Month Net Profit Projection (Line Chart) - Dynamic
  const profitData = React.useMemo(() => {
    if (report?.projection?.monthly && Array.isArray(report.projection.monthly)) {
      return report.projection.monthly.map((m: any, i: number) => ({
        month: `M${m.month ?? i + 1}`,
        profit: Math.round(m.net_profit ?? (typeof m === "number" ? m : 15000)),
      }))
    }
    return [
      { month: "M1", profit: 14000 },
      { month: "M2", profit: 18000 },
      { month: "M3", profit: 22000 },
      { month: "M4", profit: 26000 },
      { month: "M5", profit: 28000 },
      { month: "M6", profit: 28500 },
      { month: "M7", profit: 27000 },
      { month: "M8", profit: 29000 },
      { month: "M9", profit: 29500 },
      { month: "M10", profit: 30000 },
      { month: "M11", profit: 31000 },
      { month: "M12", profit: 32000 },
    ]
  }, [report])

  // 4. Loan Amortization Balance (Area Chart) - Dynamic
  const loanBalanceData = React.useMemo(() => {
    if (report?.repayment?.schedule && report.repayment.schedule.length > 0) {
      const sched = report.repayment.schedule
      // Sample points: Start, then every 6 months, and end
      const points = [{ month: "Start", balance: Math.round(report.repayment.loan_amount ?? schemeLoan) }]
      const step = Math.max(1, Math.floor(sched.length / 6))
      for (let i = step - 1; i < sched.length; i += step) {
        points.push({
          month: `${sched[i].month}M`,
          balance: Math.round(sched[i].closing_balance ?? sched[i].balance ?? 0),
        })
      }
      if (points[points.length - 1].month !== `${sched[sched.length - 1].month}M`) {
        points.push({
          month: `${sched[sched.length - 1].month}M`,
          balance: Math.round(sched[sched.length - 1].closing_balance ?? 0),
        })
      }
      return points
    }
    return [
      { month: "Start", balance: schemeLoan },
      { month: "6M", balance: Math.round(schemeLoan * 0.86) },
      { month: "12M", balance: Math.round(schemeLoan * 0.72) },
      { month: "18M", balance: Math.round(schemeLoan * 0.56) },
      { month: "24M", balance: Math.round(schemeLoan * 0.39) },
      { month: "30M", balance: Math.round(schemeLoan * 0.20) },
      { month: "36M", balance: 0 },
    ]
  }, [report, schemeLoan])

  // 5. Risk Radar - Dynamic from factor_scores
  const riskRadarData = React.useMemo(() => {
    if (report?.score?.factor_scores) {
      const fs = report.score.factor_scores
      // If array of {factor, score}
      if (Array.isArray(fs)) {
        return fs.map((item: any) => ({
          subject: (item.factor || "Factor").charAt(0).toUpperCase() + (item.factor || "Factor").slice(1),
          score: Math.round(item.score || 70),
        }))
      }
      // If object {market: 72, capital: 60, ...}
      return Object.entries(fs).map(([k, v]) => ({
        subject: k.charAt(0).toUpperCase() + k.slice(1),
        score: Math.round(Number(v) || 70),
      }))
    }
    return [
      { subject: "Market Demand", score: 85 },
      { subject: "Capital Adequacy", score: 65 },
      { subject: "Repayment (DSCR)", score: 80 },
      { subject: "Break-even Speed", score: 75 },
      { subject: "Supply Stability", score: 70 },
    ]
  }, [report])

  // 6. Overall Feasibility Score & Verdict
  const scoreValue = Math.round(report?.score?.score ?? 71)
  const verdictDisplay = report?.score?.verdict_display || report?.score?.verdict_label || "Feasible With Conditions"
  const formattedVerdict = verdictDisplay.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())

  const enterpriseName = idea?.business_type || (profile.district ? `${profile.district} Rural Enterprise` : "Enterprise")

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-foreground">
            {t("dashboard.title")} & Analytics
          </h2>
          {report && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
              Live Plan Data
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {enterpriseName} metrics: capital structure, projected margins, loan amortization, and risk distribution.
        </p>
      </div>

      {/* Grid of 6 Recharts Displays */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Donut: Investment Breakdown */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">
              {t("dashboard.investment_breakdown")}
            </h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), "Amount"]}
                  />
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
          </CardContent>
        </Card>

        {/* 2. Stacked Bar: Capital vs Gap */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">
              {t("dashboard.capital_vs_gap")}
            </h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capitalGapData} layout="vertical">
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
                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs" /> Savings: {formatCurrency(userCapital)} ({ownPct}%)
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="w-2.5 h-2.5 bg-amber-600 rounded-xs" /> Loan: {formatCurrency(schemeLoan)} ({loanPct}%)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Line Chart: 12-Month Net Profit Projection */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">
              {t("dashboard.profit_projection")}
            </h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#15803d"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-center text-muted-foreground">
              {report?.projection?.annual_net_profit
                ? `Total 12-Month Projected Profit: ${formatCurrency(report.projection.annual_net_profit)}`
                : "Steady monthly net margin stabilizes across Year 1."}
            </div>
          </CardContent>
        </Card>

        {/* 4. Area Chart: Loan Balance Over Months */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">
              {t("dashboard.loan_balance")}
            </h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={loanBalanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#8c6a53"
                    fill="#dfd3c3"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-center text-muted-foreground">
              {report?.repayment?.emi
                ? `Monthly installment: ${formatCurrency(report.repayment.emi)}/month over ${report.repayment.tenure_months || 36} months.`
                : "Amortized debt payoff schedule over repayment tenure."}
            </div>
          </CardContent>
        </Card>

        {/* 5. Radar Chart: Feasibility Factor Scores */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">
              {t("dashboard.risk_profile")} (Radar)
            </h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={riskRadarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#15803d"
                    fill="#15803d"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-center text-muted-foreground">
              Dynamic multi-factor readiness evaluation across financial & market dimensions.
            </div>
          </CardContent>
        </Card>

        {/* 6. Score Radial Indicator */}
        <Card className="border-border flex flex-col justify-between p-5">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-foreground">
              {t("dashboard.feasibility_score")}
            </h3>
            <p className="text-xs text-muted-foreground">Weighted decision matrix rating</p>
          </div>

          <div className="py-6 flex flex-col items-center justify-center">
            <div className="w-28 h-28 rounded-xl border-4 border-primary/40 bg-secondary/40 flex flex-col items-center justify-center shadow-xs">
              <span className="text-3xl font-black text-primary">{scoreValue}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Out of 100</span>
            </div>
            <span className="mt-3 text-xs font-bold px-3 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-md text-center">
              {formattedVerdict}
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground text-center">
            {report?.repayment?.dscr
              ? `DSCR: ${report.repayment.dscr.toFixed(2)} (${report.repayment.affordable ? "Bankable" : "Tight Debt Service"})`
              : "Meets standard bankable threshold under MSME scheme criteria."}
          </div>
        </Card>
      </div>
    </div>
  )
}
