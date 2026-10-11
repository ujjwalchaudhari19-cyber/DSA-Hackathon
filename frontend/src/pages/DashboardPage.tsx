import React from "react"
import { useTranslation } from "react-i18next"
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

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation()

  // 1. Investment Breakdown (Donut)
  const donutData = [
    { name: "Cattle (4 Cows)", value: 180000, color: "#15803d" },
    { name: "Shed Setup", value: 35000, color: "#8c6a53" },
    { name: "Machinery & Cans", value: 20000, color: "#d97706" },
    { name: "Initial Feed", value: 25000, color: "#166534" },
    { name: "Working Capital", value: 26000, color: "#a98468" },
  ]

  // 2. Capital vs Gap (Bar)
  const capitalGapData = [
    { category: "Funding Outlay", OwnCapital: 50000, SchemeLoan: 236000 },
  ]

  // 3. 12-Month Net Profit Projection (Line)
  const profitData = [
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

  // 4. Loan Amortization Balance (Area)
  const loanBalanceData = [
    { month: "Start", balance: 236000 },
    { month: "6M", balance: 204000 },
    { month: "12M", balance: 170000 },
    { month: "18M", balance: 133000 },
    { month: "24M", balance: 93000 },
    { month: "30M", balance: 49000 },
    { month: "36M", balance: 0 },
  ]

  // 5. Risk Radar
  const riskRadarData = [
    { subject: "Market Demand", score: 85 },
    { subject: "Capital Adequacy", score: 65 },
    { subject: "Repayment (DSCR)", score: 80 },
    { subject: "Break-even Speed", score: 75 },
    { subject: "Supply Stability", score: 70 },
  ]

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-earth-900">
          {t("dashboard.title")} & Analytics
        </h2>
        <p className="text-sm text-earth-600">
          Visual metrics: capital structure, 12-month projected margins, loan amortization, and risk distribution.
        </p>
      </div>

      {/* Grid of 6 Recharts Displays */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Donut: Investment Breakdown */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-earth-900">
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
            <div className="flex flex-wrap gap-2 text-[10px] text-earth-600 justify-center">
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
            <h3 className="font-bold text-sm text-earth-900">
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
              <span className="flex items-center gap-1.5 text-primary-800">
                <span className="w-2.5 h-2.5 bg-primary rounded-xs" /> Savings: ₹50,000 (17.5%)
              </span>
              <span className="flex items-center gap-1.5 text-amber-800">
                <span className="w-2.5 h-2.5 bg-amber-600 rounded-xs" /> Loan: ₹2,36,000 (82.5%)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Line Chart: 12-Month Net Profit Projection */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-earth-900">
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
            <div className="text-[11px] text-center text-earth-600">
              Steady lactating yield stabilizes by Month 5 around ₹28k-₹32k/mo.
            </div>
          </CardContent>
        </Card>

        {/* 4. Area Chart: Loan Balance Over 36 Months */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-earth-900">
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
            <div className="text-[11px] text-center text-earth-600">
              Complete amortized debt payoff in 36 months @ ₹7,564/month.
            </div>
          </CardContent>
        </Card>

        {/* 5. Radar Chart: Feasibility Factor Scores */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-earth-900">
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
            <div className="text-[11px] text-center text-earth-600">
              High strength in Market Demand (85) and DSCR Repayment (80).
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
              <span className="text-3xl font-black text-primary">71</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Out of 100</span>
            </div>
            <span className="mt-3 text-xs font-bold px-3 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-md">
              Feasible With Conditions
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground text-center">
            Meets bankable threshold (DSCR &gt; 1.25) under Mudra Kishore refinance.
          </div>
        </Card>
      </div>
    </div>
  )
}

