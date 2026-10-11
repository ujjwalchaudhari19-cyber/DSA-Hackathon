import React from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { contentByLang } from "@/data/localizedContent"
import {
  Download,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Building2,
} from "lucide-react"

export const ReportPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, idea, lang } = useAppStore()

  const currentContent = contentByLang[lang] || contentByLang.en
  const r = currentContent.report

  const score = 71
  const verdictLabel = "feasible_with_conditions"

  const handlePrint = () => {
    window.print()
  }

  const businessTitle =
    idea?.business_type ||
    (lang === "mr"
      ? "व्यावसायिक दुग्धव्यवसाय युनिट (4 गाई)"
      : lang === "hi"
      ? "व्यावसायिक लघु डेयरी इकाई (4 गायें)"
      : "Commercial Dairy Unit (4 Cows)")

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {r.title}
            </span>
            {!isOnline && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                Offline Mode (Cached)
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            {businessTitle}
          </h2>
          <span className="text-xs text-muted-foreground">
            {profile.district || (lang === "mr" || lang === "hi" ? "नासिक" : "Nashik")},{" "}
            {profile.state || (lang === "mr" || lang === "hi" ? "महाराष्ट्र" : "Maharashtra")} •{" "}
            {lang === "mr" ? "अर्जदार: सुनीता" : lang === "hi" ? "आवेदक: सुनीता" : "Applicant: Sunita"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 border-earth-300"
          >
            <Download className="w-4 h-4 text-primary-700" />
            <span>{t("common.download_pdf")}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 font-semibold"
          >
            <span>{t("dashboard.title")}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Transparent Verdict Banner */}
      <div className="p-6 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              {score}
            </div>
            <div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                {lang === "mr" ? "एकूण व्यवहार्यता निर्देशांक" : lang === "hi" ? "समग्र व्यवहार्यता सूचकांक" : "Overall Feasibility Index"}
              </span>
              <h3 className="text-xl font-bold text-foreground">
                {t(`report.${verdictLabel}`)} ({score}/100)
              </h3>
            </div>
          </div>

          <div className="text-xs text-amber-800 dark:text-amber-300 bg-card/90 p-2.5 rounded border border-amber-500/30">
            <span className="font-semibold block">{r.formulaLabel}</span>
            {r.formulaText}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
          {r.verdictSummary}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground block">{r.kpis.totalInvestLabel}</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(286000)}</span>
          <span className="text-[11px] text-muted-foreground">{r.kpis.totalInvestSub}</span>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground block">{r.kpis.capitalLabel}</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(50000)}</span>
          <span className="text-[11px] text-muted-foreground">{r.kpis.capitalSub}</span>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground block">{r.kpis.loanEmiLabel}</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(7564)}/mo</span>
          <span className="text-[11px] text-muted-foreground">{r.kpis.loanEmiSub}</span>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground block">{r.kpis.breakEvenLabel}</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{r.kpis.breakEvenValue}</span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{r.kpis.breakEvenSub}</span>
        </div>
      </div>

      {/* Report Sections Breakdown */}
      <div className="space-y-6">
        {/* Section: Market & Local Off-Take */}
        <Card className="border-border">
          <CardContent className="p-6 space-y-3">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>{r.sec1Title}</span>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {r.sec1Text}
            </p>
          </CardContent>
        </Card>

        {/* Section: Government Scheme & Debt Route */}
        <Card className="border-border">
          <CardContent className="p-6 space-y-3">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <span>{r.sec2Title}</span>
            </h4>
            <div className="p-3 bg-secondary/40 rounded border border-border text-xs space-y-1.5 text-muted-foreground">
              <div className="font-semibold text-foreground">{r.sec2WhyTitle}</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {r.sec2Points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section: Risk Mitigation & Recommendations */}
        <Card className="border-border">
          <CardContent className="p-6 space-y-3">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{r.sec3Title}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-amber-500/15 border border-amber-500/30">
                <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">{r.riskMitigationTitle}</span>
                <p className="text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                  {r.riskMitigationText}
                </p>
              </div>

              <div className="p-3 rounded bg-emerald-500/15 border border-emerald-500/30">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">{r.cibilRouteTitle}</span>
                <p className="text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
                  {r.cibilRouteText}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <div className="p-4 bg-muted/40 rounded-md border border-border text-[11px] text-muted-foreground leading-relaxed">
        {r.disclaimer}
      </div>
    </div>
  )
}
