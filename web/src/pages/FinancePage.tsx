import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { SchemeCard } from "@/components/finance/SchemeCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { calculateEmi, calculateTotalInterest } from "@/lib/emi"
import { api, getBusinessItems, getAllSchemes, getMonthlyProfit } from "@/services/api"
import { canonicalBusinessId } from "@/lib/businessId"
import type { InvestmentItem, Scheme } from "@/types"
import {
  Banknote,
  Calculator,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  PlusCircle,
  Trash2,
  RotateCcw,
  Sparkles,
  WifiOff,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Business-id resolution lives in "@/lib/businessId" so it is shared and tested.

// ---------------------------------------------------------------------------
// Static offline fallback — used when the API is unreachable
// Values match the businesses.json cost templates (small scale, no price factor)
// ---------------------------------------------------------------------------
const STATIC_ITEMS: Record<string, InvestmentItem[]> = {
  dairy_small: [
    { name: "Milch cattle (2 animals)", qty: 2, unit_cost: 65000, total: 130000, category: "fixed" },
    { name: "Basic shed improvement", qty: 1, unit_cost: 50000, total: 50000, category: "fixed" },
    { name: "Working capital for feed (3 months)", qty: 3, unit_cost: 12000, total: 36000, category: "working_capital" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 21600, total: 21600, category: "fixed" },
  ],
  kirana_store: [
    { name: "Shelving and counter", qty: 1, unit_cost: 45000, total: 45000, category: "fixed" },
    { name: "Initial inventory", qty: 1, unit_cost: 80000, total: 80000, category: "working_capital" },
    { name: "Shop deposit", qty: 1, unit_cost: 30000, total: 30000, category: "fixed" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 15500, total: 15500, category: "fixed" },
  ],
  tailoring: [
    { name: "Sewing machines", qty: 2, unit_cost: 18000, total: 36000, category: "fixed" },
    { name: "Cutting table and furniture", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
    { name: "Fabric and notions (2 months)", qty: 2, unit_cost: 15000, total: 30000, category: "working_capital" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 8400, total: 8400, category: "fixed" },
  ],
  poultry_farming: [
    { name: "Poultry shed & equipment", qty: 1, unit_cost: 60000, total: 60000, category: "fixed" },
    { name: "Day-old chicks (1 batch of 500)", qty: 1, unit_cost: 17500, total: 17500, category: "working_capital" },
    { name: "Feed and medication (2 months)", qty: 2, unit_cost: 18000, total: 36000, category: "working_capital" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 11350, total: 11350, category: "fixed" },
  ],
  goat_farming: [
    { name: "Goats (10 animals)", qty: 10, unit_cost: 8000, total: 80000, category: "fixed" },
    { name: "Shed construction", qty: 1, unit_cost: 40000, total: 40000, category: "fixed" },
    { name: "Feed and veterinary (2 months)", qty: 2, unit_cost: 8000, total: 16000, category: "working_capital" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 13600, total: 13600, category: "fixed" },
  ],
  mobile_repair: [
    { name: "Repair tools & soldering station", qty: 1, unit_cost: 25000, total: 25000, category: "fixed" },
    { name: "Display & components stock", qty: 1, unit_cost: 30000, total: 30000, category: "working_capital" },
    { name: "Shop furniture & counter", qty: 1, unit_cost: 15000, total: 15000, category: "fixed" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 7000, total: 7000, category: "fixed" },
  ],
  flour_spice_mill: [
    { name: "Commercial flour mill machine", qty: 1, unit_cost: 55000, total: 55000, category: "fixed" },
    { name: "Spice pulveriser machine", qty: 1, unit_cost: 40000, total: 40000, category: "fixed" },
    { name: "Grain stock & packaging (2 months)", qty: 2, unit_cost: 15000, total: 30000, category: "working_capital" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 12500, total: 12500, category: "fixed" },
  ],
  tiffin_food_stall: [
    { name: "Commercial stove & cookware", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
    { name: "Tiffin boxes & packaging", qty: 1, unit_cost: 12000, total: 12000, category: "fixed" },
    { name: "Raw materials (2 months)", qty: 2, unit_cost: 15000, total: 30000, category: "working_capital" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 6000, total: 6000, category: "fixed" },
  ],
  mushroom_farming: [
    { name: "Spawn & substrate materials", qty: 1, unit_cost: 25000, total: 25000, category: "working_capital" },
    { name: "Polyhouse / growing shed", qty: 1, unit_cost: 45000, total: 45000, category: "fixed" },
    { name: "Humidity & temperature equipment", qty: 1, unit_cost: 20000, total: 20000, category: "fixed" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 9000, total: 9000, category: "fixed" },
  ],
  csc_eseva_center: [
    { name: "Computer & printer setup", qty: 1, unit_cost: 45000, total: 45000, category: "fixed" },
    { name: "Biometric device & scanner", qty: 1, unit_cost: 15000, total: 15000, category: "fixed" },
    { name: "Internet & working capital (2 months)", qty: 2, unit_cost: 5000, total: 10000, category: "working_capital" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 7000, total: 7000, category: "fixed" },
  ],
  commercial_transport: [
    { name: "Commercial vehicle (down payment)", qty: 1, unit_cost: 320000, total: 320000, category: "fixed" },
    { name: "RTO permit, fitness & insurance", qty: 1, unit_cost: 42000, total: 42000, category: "fixed" },
    { name: "GPS tracker & loading equipment", qty: 1, unit_cost: 15000, total: 15000, category: "fixed" },
    { name: "Fuel & tolls working capital (2 months)", qty: 2, unit_cost: 25000, total: 50000, category: "working_capital" },
    { name: "Contingency (10%)", qty: 1, unit_cost: 42700, total: 42700, category: "fixed" },
  ],
}

const STATIC_MONTHLY_PROFIT: Record<string, number> = {
  commercial_transport: 42000,
  flour_spice_mill: 33000,
  kirana_store: 32000,
  tailoring: 20000,
  poultry_farming: 28000,
  goat_farming: 22000,
  mobile_repair: 24000,
  tiffin_food_stall: 20000,
  mushroom_farming: 24000,
  csc_eseva_center: 20000,
  dairy_small: 26000,
}

const STATIC_SCHEMES: Scheme[] = [
  {
    id: "mudra",
    name: "PM MUDRA Yojana (Kishore/Tarun)",
    type: "Micro-Credit",
    agency: "Ministry of Finance / Public Sector Banks",
    eligible: "yes",
    reasons: ["Collateral-free micro-enterprise credit up to ₹10 Lakh"],
    benefits: "No collateral required. Shishu (up to ₹50k), Kishore (₹50k–₹5L), Tarun (₹5L–₹10L).",
    interest_range: "8.5% – 12% p.a.",
    collateral: "Nil (CGFMU covered)",
    how_to_apply: ["Apply via Udyamimitra portal or any commercial bank."],
    source_url: "https://www.mudra.org.in/",
    last_verified: "2026-10-11",
  },
  {
    id: "pmegp",
    name: "PM Employment Generation Programme (PMEGP)",
    type: "Credit Linked Subsidy",
    agency: "KVIC / KVIB / DIC",
    eligible: "yes",
    reasons: ["25–35% capital subsidy on project cost"],
    benefits: "35% government capital subsidy (rural / special category). Beneficiary contribution only 5%.",
    interest_range: "10% – 11.5% p.a.",
    collateral: "No collateral up to ₹10 Lakh (CGTMSE)",
    how_to_apply: ["Apply online on PMEGP e-portal with DPR and category certificate."],
    source_url: "https://www.kviconline.gov.in/pmegpeportal/",
    last_verified: "2026-10-11",
  },
  {
    id: "pm_fme",
    name: "PM-FME (Food Processing Enterprises)",
    type: "Credit Linked Capital Grant",
    agency: "Ministry of Food Processing Industries",
    eligible: "maybe",
    reasons: ["35% credit-linked subsidy for food & agri processing"],
    benefits: "35% subsidy on eligible project cost, max ₹10 Lakh per enterprise.",
    interest_range: "Normal bank rates apply",
    collateral: "Covered under CGTMSE",
    how_to_apply: ["Register on pmfme.mofpi.gov.in with District Resource Person."],
    source_url: "https://pmfme.mofpi.gov.in/",
    last_verified: "2026-10-11",
  },
]

function getStaticItems(bizId: string): InvestmentItem[] {
  return (STATIC_ITEMS[bizId] || STATIC_ITEMS["dairy_small"]).map(i => ({ ...i }))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FinancePage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, idea, lang, report, setReport } = useAppStore()

  const bizId = canonicalBusinessId(idea)
  const scale = (idea?.scale as string) || "small"
  const district = profile.district || "fallback"

  // ── Investment items state ──────────────────────────────────────────────
  const [items, setItems] = useState<InvestmentItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemsError, setItemsError] = useState<string | null>(null)

  // ── Schemes state ────────────────────────────────────────────────────────
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [schemesLoading, setSchemesLoading] = useState(true)

  // ── Monthly profit for DSCR ──────────────────────────────────────────────
  const [monthlyProfit, setMonthlyProfit] = useState<number>(0)

  // ── Custom item addition form ────────────────────────────────────────────
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customUnitCost, setCustomUnitCost] = useState<number | "">("")
  const [customQty, setCustomQty] = useState<number>(1)
  const [customCategory, setCustomCategory] = useState<"fixed" | "working_capital">("fixed")

  // ── Fetch investment items from backend ──────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setItemsLoading(true)
    setItemsError(null)

    getBusinessItems(bizId, scale, district)
      .then((data) => {
        if (cancelled) return
        const mapped: InvestmentItem[] = data.items.map((it) => ({
          name: it.name,
          qty: it.qty,
          unit_cost: it.unit_cost,
          total: it.total,
          category: it.category,
        }))
        setItems(mapped)
        if (data.monthly_net_profit_estimate > 0) {
          setMonthlyProfit(data.monthly_net_profit_estimate)
        }
      })
      .catch(async () => {
        if (cancelled) return
        // Fallback 1: try POST /finance/investment
        try {
          const res = await api.post("/finance/investment", {
            idea: { business_id: bizId, scale },
            district,
            quantity_overrides: [],
          })
          if (!cancelled && res.data?.items?.length > 0) {
            const mapped: InvestmentItem[] = res.data.items.map((it: any) => ({
              name: it.item,
              qty: it.quantity,
              unit_cost: Math.round(it.unit_cost),
              total: Math.round(it.line_total),
              category: it.category || "fixed",
            }))
            setItems(mapped)
            return
          }
        } catch {
          // both API calls failed — use static offline data
        }
        // Fallback 2: static offline items (always works)
        if (!cancelled) {
          setItems(getStaticItems(bizId))
          setMonthlyProfit(STATIC_MONTHLY_PROFIT[bizId] || 25000)
          setItemsError("offline")   // signal offline mode (not a hard error)
        }
      })
      .finally(() => { if (!cancelled) setItemsLoading(false) })

    return () => { cancelled = true }
  }, [bizId, scale, district])

  // ── Fetch monthly profit for DSCR (dedicated endpoint) ──────────────────
  useEffect(() => {
    let cancelled = false
    // If report already has projection data, prefer that
    if (report?.projection?.annual_net_profit && report.projection.annual_net_profit > 0) {
      setMonthlyProfit(Math.round(report.projection.annual_net_profit / 12))
      return
    }
    getMonthlyProfit(bizId, scale, district)
      .then((data) => { if (!cancelled) setMonthlyProfit(data.monthly_net_profit) })
      .catch(() => {/* keep whatever estimate we already have */})
    return () => { cancelled = true }
  }, [bizId, scale, district, report?.projection?.annual_net_profit])

  // ── Fetch schemes from backend ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setSchemesLoading(true)
    getAllSchemes()
      .then((data) => {
        if (cancelled) return
        const mapped: Scheme[] = data.schemes.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.subsidy_pct > 0 ? "Credit Linked Subsidy" : "Term Loan / Micro-Credit",
          agency: s.how_to_apply?.[0]?.includes("KVIC") ? "KVIC / KVIB / DIC" : "Ministry of Finance / Public Sector Banks",
          eligible: "yes" as const,
          reasons: [s.benefits],
          benefits: s.benefits,
          interest_range: s.interest_note,
          collateral: s.collateral_note,
          how_to_apply: s.how_to_apply,
          source_url: s.source_url,
          last_verified: data.last_verified,
        }))
        setSchemes(mapped)
      })
      .catch(() => {
        // Backend unreachable — use static scheme list
        if (!cancelled) setSchemes(STATIC_SCHEMES)
      })
      .finally(() => { if (!cancelled) setSchemesLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── Derived numbers ──────────────────────────────────────────────────────
  const totalInvestment = items.reduce((acc, it) => acc + it.total, 0)
  const userCapital = profile.capital || 0
  const fundingGap = Math.max(0, totalInvestment - userCapital)

  // ── EMI calculator state ─────────────────────────────────────────────────
  const [loanAmount, setLoanAmount] = useState(0)
  const [interestRate, setInterestRate] = useState(9.5)
  const [tenureMonths, setTenureMonths] = useState(36)

  // Sync loan amount when gap changes
  useEffect(() => { setLoanAmount(fundingGap) }, [fundingGap])

  // ── Sync changes back into report store ─────────────────────────────────
  useEffect(() => {
    if (!report || items.length === 0) return
    setReport({
      ...report,
      investment: {
        ...report.investment,
        total: totalInvestment,
        working_capital: report.investment?.working_capital ?? 0,
        fixed_cost: report.investment?.fixed_cost ?? 0,
        items: items.map((it) => ({
          item: it.name || it.item || "",
          unit_cost: it.unit_cost,
          quantity: it.qty ?? it.quantity ?? 1,
          total: it.total,
        })),
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, totalInvestment])

  // ── EMI maths ────────────────────────────────────────────────────────────
  const effectiveLoan = Math.max(0, Number(loanAmount) || 0)
  const currentEmi = effectiveLoan > 0 ? calculateEmi(effectiveLoan, interestRate, tenureMonths) : 0
  const totalInterest = effectiveLoan > 0 ? calculateTotalInterest(effectiveLoan, interestRate, tenureMonths) : 0
  const totalRepayment = effectiveLoan + totalInterest
  const principalPct = totalRepayment > 0 ? Math.round((effectiveLoan / totalRepayment) * 100) : 100
  const interestPct = 100 - principalPct

  const dscrNumber = currentEmi > 0 && monthlyProfit > 0 ? monthlyProfit / currentEmi : (currentEmi === 0 ? 5.0 : 0)
  const dscrFormatted = dscrNumber.toFixed(2)
  const isAffordable = dscrNumber >= 1.25

  // ── Item mutation handlers ───────────────────────────────────────────────
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty < 1) return
    const updated = [...items]
    updated[index] = { ...updated[index], qty: newQty, total: newQty * updated[index].unit_cost }
    setItems(updated)
    setLoanAmount(Math.max(0, updated.reduce((a, i) => a + i.total, 0) - userCapital))
  }

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) return
    const updated = items.filter((_, idx) => idx !== index)
    setItems(updated)
    setLoanAmount(Math.max(0, updated.reduce((a, i) => a + i.total, 0) - userCapital))
  }

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim() || !customUnitCost || Number(customUnitCost) <= 0) return
    const cost = Number(customUnitCost)
    const qty = Math.max(1, customQty)
    const newItem: InvestmentItem = {
      name: customName.trim(),
      qty,
      unit_cost: cost,
      total: cost * qty,
      category: customCategory,
      isCustom: true,
    }
    const updated = [...items, newItem]
    setItems(updated)
    setLoanAmount(Math.max(0, updated.reduce((a, i) => a + i.total, 0) - userCapital))
    setCustomName("")
    setCustomUnitCost("")
    setCustomQty(1)
    setShowAddCustom(false)
  }

  // ── Display labels ───────────────────────────────────────────────────────
  const businessTitle = (idea?.business_type || bizId)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

  // ── Subsidiy note — driven purely by scheme data ─────────────────────────
  const subsidyNote = (() => {
    const eligible = schemes.filter((s) => s.eligible === "yes")
    if (eligible.length === 0) return t("finance.scheme_loading")
    const best = eligible[0]
    if (lang === "mr") return `${best.name} अंतर्गत विनातारण कर्जासाठी पात्र.`
    if (lang === "hi") return `${best.name} योजना अंतर्गत ऋण के लिए पात्र।`
    return `Eligible for funding under ${best.name}. ${best.interest_range ? `Interest: ${best.interest_range}.` : ""}`
  })()

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-md mb-2">
          <span>{businessTitle}</span>
        </div>
        <h2 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <Banknote className="w-6 h-6 text-primary-700" />
          <span>{t("finance.title")}</span>
        </h2>
        <p className="text-sm text-earth-600">
          {lang === "mr"
            ? "प्रकल्पाचा एकूण खर्च, अनुदाने आणि बँक कर्जाचा हप्ता (EMI) समजून घ्या."
            : lang === "hi"
            ? "परियोजना लागत, सरकारी सब्सिडी और ऋण की मासिक किस्त (EMI) देखें।"
            : "Tweak quantities or add custom equipment to recalculate capital requirement, funding gap, and matched government loans."}
        </p>
      </div>

      {/* Loading indicator */}
      {itemsLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>
            {lang === "mr" ? "व्यवसाय खर्चाचा डेटा लोड होत आहे..." : lang === "hi" ? "व्यवसाय लागत डेटा लोड हो रहा है..." : "Loading live investment data from server…"}
          </span>
        </div>
      )}

      {/* Offline banner — soft warning, not a blocker */}
      {itemsError === "offline" && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-400">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {lang === "mr"
              ? "सर्व्हर उपलब्ध नाही — अंदाजे डेटा दाखवत आहे. सर्व्हर सुरू केल्यावर लाइव्ह डेटा लोड होईल."
              : lang === "hi"
              ? "सर्वर उपलब्ध नहीं — अनुमानित डेटा दिखाया जा रहा है। सर्वर शुरू होने पर लाइव डेटा लोड होगा।"
              : "Server offline — showing estimated data. Live figures will load once the backend is running."}
          </span>
        </div>
      )}

      {/* ── Section 1: Investment table + capital adequacy ── */}
      {!itemsLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-earth-900">{t("finance.investment_table")}</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="text-xs flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>
                  {lang === "mr" ? "+ स्वतःचे साहित्य / खर्च जोडा" : lang === "hi" ? "+ अपना कस्टम निवेश जोड़ें" : "+ Add Custom Item"}
                </span>
              </Button>
            </div>

            {/* Custom item form */}
            {showAddCustom && (
              <Card className="border-primary/40 bg-primary/5 p-4 rounded-lg shadow-xs">
                <form onSubmit={handleAddCustomItem} className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-primary">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                      {lang === "mr" ? "नवीन खर्च किंवा यंत्रसामग्री जोडा" : lang === "hi" ? "नया उपकरण या कस्टम खर्च जोड़ें" : "Add Custom Equipment or Expense Item"}
                    </span>
                    <button type="button" onClick={() => setShowAddCustom(false)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        {lang === "mr" ? "साहित्याचे / उपकरणाचे नाव" : lang === "hi" ? "उपकरण या सामग्री का नाम" : "Item Description"}
                      </label>
                      <input
                        type="text" required value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder={lang === "mr" ? "उदा. कमर्शियल डीप फ्रीझर..." : lang === "hi" ? "उदा. कमर्शियल डीप फ्रीजर..." : "e.g., Commercial Refrigerator, Solar Backup…"}
                        className="w-full text-xs bg-card border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        {lang === "mr" ? "प्रति नग किंमत (₹)" : lang === "hi" ? "प्रति इकाई लागत (₹)" : "Unit Cost (₹)"}
                      </label>
                      <input
                        type="number" required min="100" step="500"
                        value={customUnitCost}
                        onChange={(e) => setCustomUnitCost(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="₹ 25,000"
                        className="w-full text-xs bg-card border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        {lang === "mr" ? "नग / संख्या (Qty)" : lang === "hi" ? "मात्रा (Qty)" : "Quantity"}
                      </label>
                      <input
                        type="number" min="1" value={customQty}
                        onChange={(e) => setCustomQty(Math.max(1, Number(e.target.value)))}
                        className="w-full text-xs bg-card border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        {lang === "mr" ? "खर्चाचा प्रकार" : lang === "hi" ? "व्यय श्रेणी" : "Category"}
                      </label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as any)}
                        className="w-full text-xs bg-card border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="fixed">{lang === "mr" ? "स्थिर भांडवल" : lang === "hi" ? "अचल पूंजी" : "Fixed Asset / Equipment"}</option>
                        <option value="working_capital">{lang === "mr" ? "खेळते भांडवल" : lang === "hi" ? "कार्यशील पूंजी" : "Working Capital / Raw Stock"}</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" className="w-full text-xs font-semibold">
                        {lang === "mr" ? "खर्च जोडा" : lang === "hi" ? "जोड़ें" : "Add to Investment"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCustom(false)} className="text-xs">
                        {lang === "mr" ? "रद्द" : lang === "hi" ? "रद्द" : "Cancel"}
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>
            )}

            {/* Investment table */}
            <div className="overflow-x-auto border border-border rounded-lg bg-card">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-foreground font-semibold uppercase text-[11px] border-b border-border">
                  <tr>
                    <th className="p-3">{t("finance.item")}</th>
                    <th className="p-3 text-center">{t("finance.qty")}</th>
                    <th className="p-3 text-right">{t("finance.unit_cost")}</th>
                    <th className="p-3 text-right">{t("finance.total")}</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.name || item.item}</span>
                          {item.isCustom && (
                            <span className="text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.5 rounded">
                              Custom
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                            item.category === "working_capital"
                              ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                          }`}>
                            {item.category === "working_capital"
                              ? (lang === "mr" ? "खेळते भांडवल" : lang === "hi" ? "कार्यशील" : "Working Capital")
                              : (lang === "mr" ? "स्थिर" : lang === "hi" ? "अचल" : "Fixed")}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5 border border-border rounded px-1.5 py-0.5 bg-secondary/50">
                          <button type="button" onClick={() => handleUpdateQty(idx, (item.qty ?? 1) - 1)} className="text-muted-foreground hover:text-foreground px-1 font-bold cursor-pointer" title="Decrease">-</button>
                          <span className="font-semibold text-foreground">{item.qty ?? item.quantity ?? 1}</span>
                          <button type="button" onClick={() => handleUpdateQty(idx, (item.qty ?? 1) + 1)} className="text-muted-foreground hover:text-foreground px-1 font-bold cursor-pointer" title="Increase">+</button>
                        </div>
                      </td>
                      <td className="p-3 text-right text-muted-foreground">{formatCurrency(item.unit_cost)}</td>
                      <td className="p-3 text-right font-bold text-foreground">{formatCurrency(item.total)}</td>
                      <td className="p-3 text-center">
                        <button type="button" onClick={() => handleDeleteItem(idx)} className="text-muted-foreground hover:text-rose-600 p-1 rounded hover:bg-rose-500/10 cursor-pointer transition-colors" title="Remove item">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/40 border-t border-border font-bold">
                  <tr>
                    <td colSpan={3} className="p-3 text-foreground text-right">{t("finance.total_investment")}:</td>
                    <td className="p-3 text-right text-primary text-sm font-extrabold">{formatCurrency(totalInvestment)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Capital adequacy panel */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-earth-900">{t("finance.capital_adequacy")}</h3>
            <Card className="border-border">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-earth-600">
                    <span>{t("finance.your_capital")}</span>
                    <span className="font-bold text-earth-900">{formatCurrency(userCapital)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-earth-600">
                    <span>{t("finance.total_investment")}</span>
                    <span className="font-bold text-earth-900">{formatCurrency(totalInvestment)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="w-full bg-earth-200 h-3 rounded overflow-hidden flex">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${Math.min(100, (userCapital / Math.max(1, totalInvestment)) * 100)}%` }}
                    />
                    <div
                      className="bg-amber-500 h-full transition-all"
                      style={{ width: `${Math.max(0, 100 - (userCapital / Math.max(1, totalInvestment)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-earth-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-primary" />
                      {t("finance.your_capital")} ({Math.round((userCapital / Math.max(1, totalInvestment)) * 100)}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-amber-500" />
                      {t("finance.funding_gap")}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-amber-500/15 border border-amber-500/30 space-y-1">
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold block">{t("finance.funding_gap")}</span>
                  <div className="text-2xl font-extrabold text-amber-800 dark:text-amber-300">{formatCurrency(fundingGap)}</div>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90">{subsidyNote}</p>
                </div>

                <Button
                  variant="outline" size="sm"
                  onClick={() => setLoanAmount(fundingGap)}
                  className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {lang === "mr"
                      ? `कर्ज रक्कम निधी तुटीशी जुळवा (${formatCurrency(fundingGap)})`
                      : lang === "hi"
                      ? `ऋण राशि अंतर से मिलाएँ (${formatCurrency(fundingGap)})`
                      : `Set EMI Loan to Gap (${formatCurrency(fundingGap)})`}
                  </span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Section 2: Government schemes (live from backend) ── */}
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-base text-earth-900">{t("finance.schemes_title")}</h3>
          <p className="text-xs text-earth-600">
            {lang === "mr"
              ? "अधिकृत केंद्र व महाराष्ट्र MSME मार्गदर्शक तत्त्वांमधून फिल्टर केलेल्या योजना."
              : lang === "hi"
              ? "आधिकारिक केंद्रीय व महाराष्ट्र MSME दिशानिर्देशों से फ़िल्टर की गई योजनाएं।"
              : "Filtered from official Central & Maharashtra MSME guidelines for your business type."}
          </p>
        </div>

        {schemesLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>{lang === "mr" ? "सरकारी योजना लोड होत आहेत..." : lang === "hi" ? "सरकारी योजनाएं लोड हो रही हैं..." : "Loading government schemes…"}</span>
          </div>
        ) : schemes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {schemes.slice(0, 3).map((scheme, idx) => (
              <SchemeCard key={scheme.id || idx} scheme={scheme} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            {lang === "mr" ? "सध्या कोणतीही योजना उपलब्ध नाही." : lang === "hi" ? "कोई योजना उपलब्ध नहीं है।" : "No schemes available at this time."}
          </p>
        )}
      </div>

      {/* ── Section 3: EMI calculator ── */}
      <Card className="border-border">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base text-foreground">{t("finance.emi_calculator")}</h3>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded">
              Interactive Bank Loan Simulation
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sliders */}
            <div className="lg:col-span-7 space-y-6">
              {/* Loan amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <label htmlFor="emi-loan-input">{t("finance.loan_amount")}</label>
                  <div className="flex items-center gap-1 bg-secondary border border-border rounded px-2 py-0.5">
                    <span className="text-xs text-muted-foreground font-bold">₹</span>
                    <input id="emi-loan-input" type="number" min={0} step={5000} value={effectiveLoan} onChange={(e) => setLoanAmount(Math.max(0, Number(e.target.value)))} className="w-24 text-right text-xs font-bold text-primary bg-transparent focus:outline-none" />
                  </div>
                </div>
                <input type="range" min={0} max={Math.max(1000000, Math.round(totalInvestment * 1.5))} step={1000} value={effectiveLoan} onChange={(e) => setLoanAmount(Number(e.target.value))} className="w-full accent-primary cursor-pointer h-2" />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button type="button" onClick={() => setLoanAmount(fundingGap)} className="text-[11px] font-medium px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 cursor-pointer">
                    Match Gap: {formatCurrency(fundingGap)}
                  </button>
                  {[100000, 250000, 500000, 1000000].map((p) => (
                    <button key={p} type="button" onClick={() => setLoanAmount(p)} className="text-[11px] px-2 py-0.5 rounded bg-secondary/60 text-muted-foreground border border-border hover:bg-secondary cursor-pointer">
                      {formatCurrency(p)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interest rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <label htmlFor="emi-interest-input" className="flex items-center gap-1.5">
                    {t("finance.interest_rate")}
                    {/* Colour-coded pill next to the label — updates live */}
                    {interestRate <= 10 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                        {lang === "mr" ? "उत्तम दर" : lang === "hi" ? "अच्छी दर" : "Great Rate"}
                      </span>
                    ) : interestRate <= 13 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25">
                        {lang === "mr" ? "सामान्य दर" : lang === "hi" ? "सामान्य दर" : "Standard"}
                      </span>
                    ) : interestRate <= 16 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                        {lang === "mr" ? "जास्त दर ⚠" : lang === "hi" ? "अधिक दर ⚠" : "High Rate ⚠"}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25">
                        {lang === "mr" ? "खूप जास्त दर ⛔" : lang === "hi" ? "बहुत अधिक दर ⛔" : "Very High ⛔"}
                      </span>
                    )}
                  </label>
                  <div className={`flex items-center gap-1 bg-secondary border rounded px-2 py-0.5 transition-colors ${
                    interestRate > 16
                      ? "border-rose-500/60 ring-1 ring-rose-500/30"
                      : interestRate > 13
                      ? "border-amber-500/60"
                      : "border-border"
                  }`}>
                    <input id="emi-interest-input" type="number" min={5} max={36} step={0.1} value={interestRate} onChange={(e) => setInterestRate(Math.max(0.1, Number(e.target.value)))} className="w-14 text-right text-xs font-bold text-primary bg-transparent focus:outline-none" />
                    <span className="text-xs text-muted-foreground font-bold">% p.a.</span>
                  </div>
                </div>

                {/* Gradient slider — green → amber → red */}
                <div className="relative">
                  <input
                    type="range" min={5.0} max={24.0} step={0.1} value={Math.min(interestRate, 24)}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full cursor-pointer h-2"
                    style={{
                      accentColor:
                        interestRate <= 10 ? "#16a34a"
                        : interestRate <= 13 ? "#2563eb"
                        : interestRate <= 16 ? "#d97706"
                        : "#dc2626",
                    }}
                  />
                  {/* Scale ticks */}
                  <div className="flex justify-between text-[9px] text-muted-foreground/60 px-0.5 pt-0.5 select-none">
                    <span>5%</span>
                    <span>10%</span>
                    <span>15%</span>
                    <span>20%</span>
                    <span>24%</span>
                  </div>
                </div>

                {/* Preset chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: "8.5% (Mudra Priority)", val: 8.5, color: "emerald" },
                    { label: "9.5% (Bank Standard)", val: 9.5, color: "blue" },
                    { label: "11.0% (Commercial)", val: 11.0, color: "blue" },
                    { label: "14% (NBFC)", val: 14.0, color: "amber" },
                    { label: "18% (MFI)", val: 18.0, color: "rose" },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setInterestRate(p.val)}
                      className={`text-[11px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                        Math.abs(interestRate - p.val) < 0.05
                          ? p.color === "emerald"
                            ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                            : p.color === "rose"
                            ? "bg-rose-600 text-white border-rose-600 font-bold"
                            : p.color === "amber"
                            ? "bg-amber-500 text-white border-amber-500 font-bold"
                            : "bg-primary text-white border-primary font-bold"
                          : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* ── Tiered interest rate alert ── renders only when rate is elevated */}
                {interestRate > 13 && interestRate <= 16 && (
                  <div className="flex items-start gap-2.5 mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
                    <span className="text-base leading-none mt-0.5">⚠️</span>
                    <div className="space-y-1">
                      <span className="font-bold block">
                        {lang === "mr"
                          ? `${interestRate}% व्याजदर जास्त आहे — अनुदान योजना पहा`
                          : lang === "hi"
                          ? `${interestRate}% दर अधिक है — सब्सिडी विकल्प जांचें`
                          : `${interestRate}% is above the typical scheme rate`}
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        {lang === "mr"
                          ? "मुद्रा किशोर (8.5–10.5%) किंवा PMEGP योजनेंतर्गत सवलतीचा व्याजदर मिळू शकतो. वर 'Mudra Priority' निवडा."
                          : lang === "hi"
                          ? "मुद्रा किशोर (8.5–10.5%) या PMEGP के तहत रियायती दर उपलब्ध हैं। ऊपर 'Mudra Priority' चुनें।"
                          : "MUDRA Kishore / PMEGP loans are available at 8.5–11.5% p.a. Consider applying — use the preset above to compare EMI at priority rate."}
                      </p>
                    </div>
                  </div>
                )}

                {interestRate > 16 && interestRate <= 22 && (
                  <div className="flex items-start gap-2.5 mt-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/35 text-xs text-rose-800 dark:text-rose-300">
                    <span className="text-base leading-none mt-0.5">🚨</span>
                    <div className="space-y-1">
                      <span className="font-bold block">
                        {lang === "mr"
                          ? `${interestRate}% — हा व्याजदर खूप जास्त आहे!`
                          : lang === "hi"
                          ? `${interestRate}% — यह दर बहुत अधिक है!`
                          : `${interestRate}% is very high — this will strain repayment`}
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        {lang === "mr"
                          ? "मायक्रोफायनान्स किंवा खासगी सावकाराचा व्याजदर असल्यास प्रकल्प नफा धोक्यात येऊ शकतो. मुद्रा, PMEGP किंवा CGTMSE योजनेंतर्गत बँक कर्ज घेणे अधिक फायदेशीर आहे."
                          : lang === "hi"
                          ? "माइक्रोफाइनेंस या प्राइवेट मनीलेंडर दर पर यह व्यवसाय की लाभप्रदता को नुकसान पहुंचा सकता है। मुद्रा/PMEGP/CGTMSE के तहत बैंक ऋण लेना बेहतर है।"
                          : "At this rate your DSCR will likely fall below 1.0, making the loan unserviceable. Strongly consider MUDRA / PMEGP / CGTMSE bank loans at 8.5–12% p.a. before accepting high-cost credit."}
                      </p>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => setInterestRate(8.5)} className="text-[11px] font-semibold px-2.5 py-1 rounded bg-rose-700 text-white hover:bg-rose-800 cursor-pointer">
                          {lang === "mr" ? "मुद्रा दर वापरा (8.5%)" : lang === "hi" ? "मुद्रा दर लगाएं (8.5%)" : "Switch to Mudra Rate (8.5%)"}
                        </button>
                        <button type="button" onClick={() => setInterestRate(11)} className="text-[11px] font-semibold px-2.5 py-1 rounded bg-secondary border border-rose-500/30 text-rose-800 dark:text-rose-300 hover:bg-rose-500/10 cursor-pointer">
                          {lang === "mr" ? "PMEGP दर (11%)" : lang === "hi" ? "PMEGP दर (11%)" : "PMEGP Rate (11%)"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {interestRate > 22 && (
                  <div className="flex items-start gap-2.5 mt-2 p-3 rounded-lg bg-rose-600/15 border-2 border-rose-600/50 text-xs text-rose-900 dark:text-rose-200">
                    <span className="text-lg leading-none mt-0.5">⛔</span>
                    <div className="space-y-1.5">
                      <span className="font-extrabold block text-[13px]">
                        {lang === "mr"
                          ? `${interestRate}% — हा व्याजदर धोकादायक आहे!`
                          : lang === "hi"
                          ? `${interestRate}% — यह दर खतरनाक है!`
                          : `${interestRate}% — Danger Zone: Loan is not viable at this rate`}
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        {lang === "mr"
                          ? "हा व्याजदर सावकारी किंवा अनौपचारिक कर्जाचा असू शकतो. असे कर्ज घेणे टाळा — यामुळे व्यवसाय बुडण्याचा धोका आहे. कृपया जवळच्या बँक किंवा CSC केंद्रातून सरकारी कर्ज योजना जाणून घ्या."
                          : lang === "hi"
                          ? "यह ब्याज दर साहूकार या अनौपचारिक ऋण की हो सकती है। ऐसा कर्ज न लें — इससे व्यवसाय डूब सकता है। कृपया नजदीकी बैंक या CSC केंद्र से सरकारी योजनाओं की जानकारी लें।"
                          : "This rate suggests an informal moneylender or predatory loan. No viable business can service this. Please visit your nearest bank branch or Udyamimitra portal and apply for a government-backed scheme loan."}
                      </p>
                      <div className="flex gap-2 pt-0.5 flex-wrap">
                        <button type="button" onClick={() => setInterestRate(8.5)} className="text-[11px] font-bold px-3 py-1.5 rounded bg-rose-700 text-white hover:bg-rose-800 cursor-pointer">
                          {lang === "mr" ? "मुद्रा (8.5%) वापरा" : lang === "hi" ? "मुद्रा (8.5%) लगाएं" : "Use Mudra Rate (8.5%)"}
                        </button>
                        <button type="button" onClick={() => setInterestRate(9.5)} className="text-[11px] font-bold px-3 py-1.5 rounded border-2 border-rose-600/40 text-rose-800 dark:text-rose-300 hover:bg-rose-600/10 cursor-pointer">
                          {lang === "mr" ? "बँक दर (9.5%)" : lang === "hi" ? "बैंक दर (9.5%)" : "Bank Rate (9.5%)"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tenure */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <label htmlFor="emi-tenure-input">{t("finance.tenure")}</label>
                  <div className="flex items-center gap-1 bg-secondary border border-border rounded px-2 py-0.5">
                    <input id="emi-tenure-input" type="number" min={6} max={84} step={6} value={tenureMonths} onChange={(e) => setTenureMonths(Math.max(6, Number(e.target.value)))} className="w-12 text-right text-xs font-bold text-primary bg-transparent focus:outline-none" />
                    <span className="text-xs text-muted-foreground font-bold">
                      {lang === "mr" ? "महिने" : lang === "hi" ? "माह" : "mo"} ({(tenureMonths / 12).toFixed(1)} yr)
                    </span>
                  </div>
                </div>
                <input type="range" min={6} max={84} step={6} value={tenureMonths} onChange={(e) => setTenureMonths(Number(e.target.value))} className="w-full accent-primary cursor-pointer h-2" />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[{ label: "12m (1 Yr)", val: 12 }, { label: "24m (2 Yrs)", val: 24 }, { label: "36m (3 Yrs)", val: 36 }, { label: "48m (4 Yrs)", val: 48 }, { label: "60m (5 Yrs)", val: 60 }, { label: "84m (7 Yrs)", val: 84 }].map((p) => (
                    <button key={p.val} type="button" onClick={() => setTenureMonths(p.val)} className={`text-[11px] px-2 py-0.5 rounded border cursor-pointer ${tenureMonths === p.val ? "bg-primary text-white border-primary font-bold" : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* EMI result card */}
            <div className="lg:col-span-5 bg-secondary/40 p-5 rounded-lg border border-border space-y-5">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">{t("finance.monthly_emi")}</span>
                <div className="text-3xl font-extrabold text-primary">
                  {formatCurrency(currentEmi)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {lang === "mr" ? "दरमहा हप्ता" : lang === "hi" ? "प्रति माह" : "/ month"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>Repayment Composition</span>
                  <span>{formatCurrency(totalRepayment)} Total</span>
                </div>
                <div className="w-full h-3 bg-muted rounded overflow-hidden flex">
                  <div className="bg-emerald-600 dark:bg-emerald-500 h-full transition-all" style={{ width: `${principalPct}%` }} title={`Principal: ${principalPct}%`} />
                  <div className="bg-amber-500 h-full transition-all" style={{ width: `${interestPct}%` }} title={`Interest: ${interestPct}%`} />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Principal: {formatCurrency(effectiveLoan)} ({principalPct}%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Interest: {formatCurrency(totalInterest)} ({interestPct}%)</span>
                  </span>
                </div>
              </div>

              {/* Affordability indicator */}
              <div className={`p-3 rounded text-xs flex items-start gap-2.5 border ${
                effectiveLoan === 0
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                  : dscrNumber > 0 && dscrNumber < 1.0
                  ? "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/40"
                  : isAffordable
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
              }`}>
                {effectiveLoan === 0 || isAffordable
                  ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-current" />
                  : <span className="text-base leading-none mt-0.5 flex-shrink-0">{dscrNumber < 1.0 ? "🚨" : "⚠️"}</span>
                }
                <div className="space-y-0.5">
                  <span className="font-bold block text-[13px]">
                    {effectiveLoan === 0
                      ? "100% Self-Funded (No Loan Needed)"
                      : dscrNumber > 0 && dscrNumber < 1.0
                      ? (lang === "mr" ? "परतफेड शक्य नाही — EMI नफ्यापेक्षा जास्त!" : lang === "hi" ? "भुगतान संभव नहीं — EMI लाभ से अधिक है!" : "Loan Not Serviceable — EMI exceeds monthly profit")
                      : isAffordable
                      ? t("finance.affordable")
                      : t("finance.not_affordable")}
                  </span>
                  <p className="text-[11px] leading-relaxed text-current/90">
                    {effectiveLoan === 0
                      ? "Your available capital covers 100% of the project cost. No loan repayment required."
                      : monthlyProfit > 0
                      ? `${lang === "mr" ? "अंदाजित निव्वळ नफा" : lang === "hi" ? "अनुमानित शुद्ध लाभ" : "Est. monthly net profit"}: ${formatCurrency(monthlyProfit)}. DSCR: ${dscrFormatted} (${
                          dscrNumber < 1.0
                            ? (lang === "mr" ? "परतफेड अशक्य" : lang === "hi" ? "भुगतान असंभव" : "Cannot service debt")
                            : dscrNumber >= 1.5
                            ? (lang === "mr" ? "उत्तम" : lang === "hi" ? "उत्कृष्ट" : "Strong")
                            : isAffordable
                            ? (lang === "mr" ? "पुरेसे" : lang === "hi" ? "पर्याप्त" : "Adequate")
                            : (lang === "mr" ? "कमी" : lang === "hi" ? "कम" : "Tight")
                        }).`
                      : `DSCR: ${dscrFormatted}`}
                  </p>
                  {dscrNumber > 0 && dscrNumber < 1.0 && effectiveLoan > 0 && (
                    <p className="text-[11px] font-semibold mt-1">
                      {lang === "mr"
                        ? "व्याजदर कमी करा किंवा कर्ज रक्कम कमी करा जेणेकरून DSCR ≥ 1.25 होईल."
                        : lang === "hi"
                        ? "ब्याज दर कम करें या ऋण राशि घटाएं ताकि DSCR ≥ 1.25 हो सके।"
                        : "Reduce the interest rate or loan amount until DSCR ≥ 1.25 for a bankable plan."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nav controls */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="outline" onClick={() => navigate("/analysis")} className="flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.back")}</span>
        </Button>
        <Button onClick={() => navigate("/credit")} className="flex items-center gap-1.5 font-semibold">
          <span>{t("credit.title")}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
