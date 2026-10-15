import React from "react"
import type { Scheme } from "@/types"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, XCircle, ExternalLink } from "lucide-react"

interface SchemeCardProps {
  scheme: Scheme
  onSelect?: (scheme: Scheme) => void
}

export const SchemeCard: React.FC<SchemeCardProps> = ({ scheme }) => {
  const { t } = useTranslation()
  const { lang } = useAppStore()

  const eligible = (scheme.eligible ?? "maybe") as "yes" | "maybe" | "no"
  const statusConfig = {
    yes: {
      label: t("finance.eligible"),
      icon: CheckCircle2,
      badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    },
    maybe: {
      label: t("finance.maybe_eligible"),
      icon: AlertCircle,
      badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    },
    no: {
      label: t("finance.not_eligible"),
      icon: XCircle,
      badge: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
    },
  }[eligible]

  const StatusIcon = statusConfig.icon

  return (
    <Card className="border-border hover:border-primary/40 transition-colors">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {scheme.agency}
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-xs text-muted-foreground">{scheme.type}</span>
            </div>
            <h3 className="text-lg font-bold text-foreground leading-snug mt-0.5">
              {scheme.name}
            </h3>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border rounded-md ${statusConfig.badge}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusConfig.label}</span>
          </span>
        </div>

        {/* Benefits & Subsidies Highlight */}
        <div className="p-3 bg-secondary/40 rounded-md border border-border text-xs space-y-1">
          <div className="font-semibold text-foreground">
            {lang === "mr" ? "प्रमुख फायदे व अनुदान:" : lang === "hi" ? "प्रमुख लाभ एवं सब्सिडी:" : "Key Benefits & Subsidies:"}
          </div>
          <p className="text-muted-foreground leading-relaxed">{scheme.benefits}</p>
        </div>

        {/* Financial terms grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-secondary/20 border border-border">
            <span className="text-muted-foreground block">
              {lang === "mr" ? "अंदाजित व्याजदर" : lang === "hi" ? "संभावित ब्याज दर" : "Indicative Interest Rate"}
            </span>
            <span className="font-bold text-foreground">{scheme.interest_range}</span>
          </div>
          <div className="p-2 rounded bg-secondary/20 border border-border">
            <span className="text-earth-500 block">
              {lang === "mr" ? "तारण / हमी आवश्यकता" : lang === "hi" ? "कोलैटरल / गारंटी आवश्यकता" : "Collateral Requirement"}
            </span>
            <span className="font-bold text-earth-900">
              {scheme.collateral || (lang === "mr" ? "विनातारण (CGTMSE)" : lang === "hi" ? "कोलैटरल-मुक्त (CGTMSE)" : "Collateral-free (CGTMSE)")}
            </span>
          </div>
        </div>

        {/* Reasons / Rules Note */}
        {scheme.reasons && scheme.reasons.length > 0 && (
          <div className="text-xs text-earth-600 space-y-1">
            <span className="font-semibold text-earth-800">
              {lang === "mr" ? "पात्रतेचे निकष व कारणे:" : lang === "hi" ? "पात्रता कारण एवं मानदंड:" : "Eligibility Rationale:"}
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-earth-700">
              {scheme.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* How to Apply snippet & Official Verification */}
        <div className="pt-2 border-t border-earth-100 flex items-center justify-between text-xs">
          <span className="text-earth-500 text-[11px]">
            {lang === "mr" ? "सत्यापित तारीख" : lang === "hi" ? "सत्यापन तिथि" : "Verified"}: {scheme.last_verified}
          </span>

          <a
            href={scheme.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-800 font-semibold hover:underline"
          >
            <span>{lang === "mr" ? "अधिकृत पोर्टल" : lang === "hi" ? "आधिकारिक पोर्टल" : "Official Portal"}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
