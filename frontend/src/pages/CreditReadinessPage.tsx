import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CreditCard,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react"

export const CreditReadinessPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // 5 Quiz questions
  const [answers, setAnswers] = useState({
    existingLoans: false,
    missedEmi: false,
    creditCard: false,
    firstTime: true,
    incomeProof: true,
  })

  // Rule-based credit readiness bucket
  const getBucket = () => {
    if (answers.missedEmi) return "needs_repair"
    if (answers.firstTime && !answers.existingLoans) return "thin_file"
    if (answers.existingLoans && !answers.missedEmi) return "strong"
    return "fair"
  }

  const bucket = getBucket()

  const bucketInfo = {
    thin_file: {
      title: "Thin File (First-Time Borrower)",
      badge: "bg-blue-100 text-blue-900 border-blue-300",
      summary:
        "You have no formal credit history. Lenders look for alternative proxies like bank turnover, electricity bills, or SHG membership.",
      alternatives: [
        "Mudra Shishu / Kishore (CGTMSE collateral-free guarantee)",
        "SHG-Bank Linkage route with joint liability guarantee",
        "Add a co-applicant with an existing operational savings account",
      ],
      actions: [
        { days: "30 Days", text: "Maintain steady weekly revenue deposits into your savings or current bank account." },
        { days: "60 Days", text: "Ensure utility (electricity/water) receipts are in your or immediate family's name." },
        { days: "90 Days", text: "Complete free Udyam registration online to establish formal micro-enterprise identity." },
      ],
    },
    strong: {
      title: "Strong Credit Standing",
      badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
      summary: "You have an active credit history with on-time repayments. High likelihood of swift bank appraisal.",
      alternatives: ["Standard Public Sector Bank priority lending", "PMEGP Capital Subsidy"],
      actions: [
        { days: "30 Days", text: "Collect loan NOC / account statements from existing lenders." },
        { days: "60 Days", text: "Keep credit utilization below 30%." },
      ],
    },
    fair: {
      title: "Fair Credit Readiness",
      badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
      summary: "Moderate borrowing profile. Ready for public sector micro-lending with basic KYC documentation.",
      alternatives: ["Mudra Loan", "Microfinance Institutions (MFI)"],
      actions: [{ days: "30 Days", text: "Avoid multiple simultaneous loan inquiries across banks." }],
    },
    needs_repair: {
      title: "Needs Action / Repair",
      badge: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
      summary: "Missed payments detected in history. Rectification recommended before major term loan application.",
      alternatives: ["SHG Group Lending", "Pledge gold or rural warehouse receipt"],
      actions: [
        { days: "30 Days", text: "Clear any outstanding overdue balance and obtain settlement statement." },
        { days: "60 Days", text: "Request free CIBIL score check on RBI-authorized portals to check for reporting errors." },
      ],
    },
  }[bucket]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          <span>{t("credit.title")}</span>
        </h2>
        <div className="mt-1 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-500/15 p-2 rounded border border-amber-500/30">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span>{t("credit.disclaimer")}</span>
        </div>
      </div>

      {/* 5-Question Quick Assessment */}
      <Card className="border-border">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-sm text-earth-900 uppercase tracking-wider">
            Quick Financial Profile Quiz
          </h3>

          <div className="space-y-3">
            {[
              {
                id: "firstTime",
                label: t("credit.first_time"),
                sub: "Have never taken a formal bank or cooperative loan",
              },
              {
                id: "existingLoans",
                label: t("credit.existing_loans"),
                sub: "Currently paying an active loan or vehicle installment",
              },
              {
                id: "missedEmi",
                label: t("credit.missed_emi"),
                sub: "Delayed or missed any payment in the last 12 months",
              },
              {
                id: "incomeProof",
                label: t("credit.income_proof"),
                sub: "Milk union slip, mandi receipt, or bank passbook entries",
              },
            ].map((q) => {
              const checked = (answers as any)[q.id]
              return (
                <div
                  key={q.id}
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [q.id]: !checked }))
                  }
                  className={`p-3 rounded-md border flex items-center justify-between cursor-pointer transition-all ${
                    checked
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">{q.label}</div>
                    <div className="text-xs text-muted-foreground">{q.sub}</div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border ${
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border bg-card"
                    }`}
                  >
                    {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Readiness Result */}
      <Card className="border-border bg-card">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-earth-100">
            <div>
              <span className="text-xs font-semibold text-earth-600 uppercase tracking-wider block">
                {t("credit.readiness")}
              </span>
              <h3 className="text-xl font-bold text-earth-900">{bucketInfo.title}</h3>
            </div>
            <span
              className={`px-3 py-1 text-xs font-bold border rounded-md self-start sm:self-auto ${bucketInfo.badge}`}
            >
              Category: {bucket.toUpperCase()}
            </span>
          </div>

          <p className="text-sm text-earth-700 leading-relaxed">{bucketInfo.summary}</p>

          {/* Action timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Recommended Action Timeline</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {bucketInfo.actions.map((act, i) => (
                <div key={i} className="p-3 rounded bg-secondary/40 border border-border space-y-1">
                  <span className="text-xs font-bold text-primary block">{act.days}</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{act.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alternative Routes for Thin File */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-earth-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary-700" />
              <span>{t("credit.alternatives")}</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-earth-700">
              {bucketInfo.alternatives.map((alt, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-700 flex-shrink-0" />
                  <span>{alt}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Nav Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => navigate("/finance")}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.back")}</span>
        </Button>

        <Button
          onClick={() => navigate("/report")}
          className="flex items-center gap-1.5 font-semibold"
        >
          <span>Generate Feasibility Report</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

