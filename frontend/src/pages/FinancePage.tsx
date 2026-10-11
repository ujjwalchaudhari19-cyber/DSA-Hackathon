import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { SchemeCard } from "@/components/finance/SchemeCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { calculateEmi, calculateTotalInterest } from "@/lib/emi"
import { contentByLang } from "@/data/localizedContent"
import type { InvestmentItem } from "@/types"
import { Banknote, Calculator, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react"

export const FinancePage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, lang } = useAppStore()

  const currentContent = contentByLang[lang] || contentByLang.en

  // Synchronize items with active language
  const [items, setItems] = useState<InvestmentItem[]>(currentContent.investmentItems)

  useEffect(() => {
    setItems(currentContent.investmentItems)
  }, [lang])

  const totalInvestment = items.reduce((acc, curr) => acc + curr.total, 0)
  const userCapital = profile.capital || 50000
  const fundingGap = Math.max(0, totalInvestment - userCapital)

  // Interactive EMI slider parameters
  const [loanAmount, setLoanAmount] = useState(fundingGap)
  const [interestRate, setInterestRate] = useState(9.5)
  const [tenureMonths, setTenureMonths] = useState(36)

  useEffect(() => {
    setLoanAmount(fundingGap)
  }, [fundingGap])

  const currentEmi = calculateEmi(loanAmount, interestRate, tenureMonths)
  const totalInterest = calculateTotalInterest(loanAmount, interestRate, tenureMonths)
  const projectedMonthlyNetProfit = 28000
  const isAffordable = projectedMonthlyNetProfit > currentEmi * 1.5

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty < 1) return
    const updated = [...items]
    updated[index].qty = newQty
    updated[index].total = newQty * updated[index].unit_cost
    setItems(updated)
    const newTot = updated.reduce((acc, curr) => acc + curr.total, 0)
    setLoanAmount(Math.max(0, newTot - userCapital))
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <Banknote className="w-6 h-6 text-primary-700" />
          <span>{t("finance.title")}</span>
        </h2>
        <p className="text-sm text-earth-600">
          {lang === "mr"
            ? "प्रकल्पाचा एकूण खर्च, अनुदाने आणि बँक कर्जाचा हप्ता (EMI) समजून घ्या."
            : lang === "hi"
            ? "परियोजना लागत, सरकारी सब्सिडी और ऋण की मासिक किस्त (EMI) देखें।"
            : "Tweak quantities to recalculate capital requirement, funding gap, and matched government loans."}
        </p>
      </div>

      {/* Section 1: Investment Table & Funding Gap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-bold text-base text-earth-900">
            {t("finance.investment_table")}
          </h3>

          <div className="overflow-x-auto border border-border rounded-lg bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-foreground font-semibold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="p-3">{t("finance.item")}</th>
                  <th className="p-3 text-center">{t("finance.qty")}</th>
                  <th className="p-3 text-right">{t("finance.unit_cost")}</th>
                  <th className="p-3 text-right">{t("finance.total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{item.name}</td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5 border border-border rounded px-1.5 py-0.5 bg-secondary/50">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, item.qty - 1)}
                          className="text-muted-foreground hover:text-foreground px-1 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-semibold text-foreground">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, item.qty + 1)}
                          className="text-muted-foreground hover:text-foreground px-1 font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {formatCurrency(item.unit_cost)}
                    </td>
                    <td className="p-3 text-right font-bold text-foreground">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40 border-t border-border font-bold">
                <tr>
                  <td colSpan={3} className="p-3 text-foreground text-right">
                    {t("finance.total_investment")}:
                  </td>
                  <td className="p-3 text-right text-primary text-sm">
                    {formatCurrency(totalInvestment)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Gap Summary Card */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-earth-900">
            {lang === "mr" ? "भांडवल आणि तुटवडा" : lang === "hi" ? "पूंजी और वित्तीय अंतर" : "Capital Adequacy & Gap"}
          </h3>

          <Card className="border-border bg-card">
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

              {/* Progress bar visual */}
              <div className="space-y-1">
                <div className="w-full bg-earth-200 h-3 rounded overflow-hidden flex">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${Math.min(100, (userCapital / totalInvestment) * 100)}%` }}
                    title="User Capital"
                  />
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{ width: `${Math.max(0, 100 - (userCapital / totalInvestment) * 100)}%` }}
                    title="Funding Gap"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-earth-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-primary" /> {t("finance.your_capital")} ({Math.round((userCapital / totalInvestment) * 100)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-amber-500" /> {t("finance.funding_gap")}
                  </span>
                </div>
              </div>

              {/* Gap Value banner */}
              <div className="p-3 rounded-md bg-amber-500/15 border border-amber-500/30 space-y-1">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold block">
                  {t("finance.funding_gap")}
                </span>
                <div className="text-2xl font-extrabold text-amber-800 dark:text-amber-300">
                  {formatCurrency(fundingGap)}
                </div>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90">
                  {lang === "mr"
                    ? "मुद्रा किशोर किंवा PMEGP योजनेतून 100% कर्ज व अनुदान मिळण्यास पात्र."
                    : lang === "hi"
                    ? "मुद्रा किशोर अथवा PMEGP योजना द्वारा शत-प्रतिशत ऋण सुविधा उपलब्ध।"
                    : "Eligible for 100% financing through Mudra Kishore / PMEGP schemes."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Matched Schemes */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-earth-900">
            {t("finance.schemes_title")}
          </h3>
          <p className="text-xs text-earth-600">
            {lang === "mr"
              ? "केंद्र व महाराष्ट्र शासनाच्या सूक्ष्म व्यवसाय व पशुपालन मार्गदर्शक तत्त्वांनुसार निवडलेली यादी."
              : lang === "hi"
              ? "केंद्रीय एवं राज्य एमएसएमई/पशुपालन दिशानिर्देशों के आधार पर चयनित।"
              : "Filtered from official Central & Maharashtra MSME/Animal Husbandry guidelines."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {currentContent.schemes.map((s) => (
            <SchemeCard key={s.id} scheme={s} />
          ))}
        </div>
      </div>

      {/* Section 3: EMI Slider & Affordability */}
      <Card className="border-border">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-earth-100">
            <Calculator className="w-5 h-5 text-primary-700" />
            <h3 className="text-lg font-bold text-earth-900">
              {t("finance.emi_calculator")}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sliders */}
            <div className="md:col-span-2 space-y-5">
              {/* Loan Amount */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>{t("finance.loan_amount")}</span>
                  <span className="text-sm font-bold text-primary">{formatCurrency(loanAmount)}</span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max={totalInvestment}
                  step="5000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Interest Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>{t("finance.interest_rate")}</span>
                  <span className="text-sm font-bold text-primary">{interestRate}%</span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="16"
                  step="0.25"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Tenure */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>{t("finance.tenure")}</span>
                  <span className="text-sm font-bold text-primary">{tenureMonths} {lang === "mr" ? "महिने" : lang === "hi" ? "महीने" : "Months"} ({tenureMonths / 12} {lang === "mr" ? "वर्षे" : lang === "hi" ? "वर्ष" : "Years"})</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="60"
                  step="6"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Live EMI calculation result card */}
            <div className="bg-secondary/40 p-5 rounded-lg border border-border flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  {t("finance.monthly_emi")}
                </span>
                <div className="text-3xl font-extrabold text-primary">
                  {formatCurrency(currentEmi)}
                  <span className="text-xs font-normal text-muted-foreground block">
                    {lang === "mr" ? "दरमहा हप्ता" : lang === "hi" ? "प्रति माह" : "per month"}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
                  <div className="flex justify-between">
                    <span>{t("finance.total_interest")}:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(totalInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === "mr" ? "एकूण परतफेड" : lang === "hi" ? "कुल अदायगी" : "Total Repayment"}:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(loanAmount + totalInterest)}</span>
                  </div>
                </div>
              </div>

              {/* Affordability check indicator */}
              <div
                className={`p-2.5 rounded text-xs flex items-start gap-2 border ${
                  isAffordable
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                }`}
              >
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold block">
                    {isAffordable ? t("finance.affordable") : t("finance.not_affordable")}
                  </span>
                  <span className="text-[11px] leading-tight block">
                    {lang === "mr"
                      ? `अंदाजित निव्वळ नफा: ${formatCurrency(projectedMonthlyNetProfit)}/महिना. DSCR: 1.38 (सक्षम).`
                      : lang === "hi"
                      ? `अनुमानित शुद्ध लाभ: ${formatCurrency(projectedMonthlyNetProfit)}/माह। DSCR: 1.38 (संतोषजनक)।`
                      : `Est. net profit: ${formatCurrency(projectedMonthlyNetProfit)}/mo. DSCR: 1.38 (Healthy).`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nav Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => navigate("/analysis")}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.back")}</span>
        </Button>

        <Button
          onClick={() => navigate("/credit")}
          className="flex items-center gap-1.5 font-semibold"
        >
          <span>{t("credit.title")}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
