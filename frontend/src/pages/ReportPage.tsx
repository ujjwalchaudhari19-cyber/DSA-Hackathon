import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { api } from "@/services/api"
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
  Loader2,
  RefreshCw,
} from "lucide-react"

export const ReportPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, idea, lang, report, setReport } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentContent = contentByLang[lang] || contentByLang.en
  const r = currentContent.report

  // Trigger report generation from backend if not already loaded
  useEffect(() => {
    if (!report) {
      generateFreshReport()
    }
  }, [])

  const generateFreshReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        profile: {
          state: profile.state || "Maharashtra",
          district: profile.district || "Nashik",
          village: profile.village || "Sinnar",
          capital: profile.capital || 50000,
          category: profile.category || "obc",
          gender: profile.gender || "f",
          age: profile.age || 34,
          experience: profile.experience || "some",
          first_time_borrower: profile.first_time_borrower ?? true,
        },
        idea: {
          business_type: idea?.business_type || "flour_spice_mill",
          scale: (idea?.scale as any) || "small",
          products: idea?.products || idea?.product_list || ["processed products"],
          target_customer: idea?.target_customer || "local community and markets",
        },
        loan_amount: Math.max(0, 286000 - (profile.capital || 50000)),
        loan_rate: 10.5,
        loan_tenure_months: 60,
        moratorium_months: 3,
        lang: lang || "en",
      }

      const res = await api.post("/report/generate", payload)
      if (res.data) {
        setReport(res.data)
      }
    } catch (err: any) {
      console.warn("Backend report generation failed, fallback to local model:", err)
      setError("Note: Showing pre-computed model while backend connects.")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Dynamic values extracted from report
  const score = Math.round(report?.score?.score ?? 71)
  const verdictLabel = report?.score?.verdict_label ?? "feasible_with_conditions"
  const verdictDisplay = report?.score?.verdict_display || report?.score?.verdict_label?.replace(/_/g, " ") || "Feasible With Conditions"
  const verdictSummary = report?.narrative?.verdict_summary || r.verdictSummary

  const totalInvestment = Math.round(report?.investment?.total ?? 286000)
  const userCapital = Math.round(report?.gap?.available_capital ?? (profile.capital || 50000))
  const loanEmi = Math.round(report?.repayment?.emi ?? 7564)
  const breakEvenNote = report?.projection?.break_even_note || r.kpis.breakEvenValue

  const rawBusinessType = idea?.business_type || report?.idea?.business_type || "Commercial Enterprise"
  const businessTitle = rawBusinessType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())

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
            {report && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                Live AI Generated
              </span>
            )}
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
            {lang === "mr" ? `अर्जदार: ${profile.name || "उद्योजक"}` : lang === "hi" ? `आवेदक: ${profile.name || "उद्यमी"}` : `Applicant: ${profile.name || "Entrepreneur"}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateFreshReport}
            disabled={loading}
            className="flex items-center gap-1.5"
            title="Recalculate with AI"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <RefreshCw className="w-4 h-4 text-primary" />}
            <span className="hidden sm:inline">{loading ? "Computing..." : "Regenerate"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 border-earth-300"
          >
            <Download className="w-4 h-4 text-primary" />
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

      {error && (
        <div className="p-3 bg-muted text-muted-foreground rounded text-xs border border-border">
          {error}
        </div>
      )}

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
                {verdictDisplay} ({score}/100)
              </h3>
            </div>
          </div>

          <div className="text-xs text-amber-800 dark:text-amber-300 bg-card/90 p-2.5 rounded border border-amber-500/30">
            <span className="font-semibold block">{r.formulaLabel}</span>
            {r.formulaText}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
          {verdictSummary}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground block">{r.kpis.totalInvestLabel}</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalInvestment)}</span>
          <span className="text-[11px] text-muted-foreground">{r.kpis.totalInvestSub}</span>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground block">{r.kpis.capitalLabel}</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(userCapital)}</span>
          <span className="text-[11px] text-muted-foreground">{r.kpis.capitalSub}</span>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground block">{r.kpis.loanEmiLabel}</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(loanEmi)}/mo</span>
          <span className="text-[11px] text-muted-foreground">{r.kpis.loanEmiSub}</span>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground block">{r.kpis.breakEvenLabel}</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{breakEvenNote}</span>
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
              {report?.narrative?.market_summary || r.sec1Text}
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
              <div className="font-semibold text-foreground">
                {report?.narrative?.funding_summary || r.sec2WhyTitle}
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {report?.schemes && report.schemes.length > 0 ? (
                  report.schemes.slice(0, 3).map((s: any, i: number) => (
                    <li key={i}>
                      <strong>{s.scheme_name}:</strong> {s.reasons?.[0] || s.benefits || "Eligible credit facility"}
                    </li>
                  ))
                ) : (
                  r.sec2Points.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))
                )}
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
                <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                  {r.riskMitigationTitle}
                </span>
                <p className="text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                  {report?.narrative?.risk_summary || r.riskMitigationText}
                </p>
              </div>

              <div className="p-3 rounded bg-emerald-500/15 border border-emerald-500/30">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                  {r.cibilRouteTitle}
                </span>
                <p className="text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
                  {report?.credit?.actions?.[0]?.action || r.cibilRouteText}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <div className="p-4 bg-muted/40 rounded-md border border-border text-[11px] text-muted-foreground leading-relaxed">
        {report?.narrative?.disclaimer || r.disclaimer}
      </div>
    </div>
  )
}
