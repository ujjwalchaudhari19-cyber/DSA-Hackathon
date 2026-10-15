import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type InvestmentSlice = { name: string; value: number }
type MonthlyRow = { month: number | string; profit?: number; base?: number; optimistic?: number; downside?: number }
type BalanceRow = { month: number | string; balance: number }

const COLORS = ["#167a45", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444"]
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export function InvestmentDonut({ data }: { data: InvestmentSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={2}>
          {data.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function ProfitScenarios({ data }: { data: MonthlyRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} tick={{ fontSize: 11 }} width={42} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="base" name="Base" stroke="#167a45" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="optimistic" name="Optimistic" stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="downside" name="Downside" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function LoanBalance({ data }: { data: BalanceRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} tick={{ fontSize: 11 }} width={42} />
        <Tooltip />
        <Area type="monotone" dataKey="balance" name="Loan balance" stroke="#d97706" fill="url(#balanceFill)" strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
