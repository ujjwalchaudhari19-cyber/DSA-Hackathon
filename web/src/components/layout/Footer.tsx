import React from "react"
import { useTranslation } from "react-i18next"

export const Footer: React.FC = () => {
  const { t } = useTranslation()

  return (
    <footer className="w-full border-t border-border bg-card py-6 text-muted-foreground text-xs mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-semibold text-foreground">{t("app_name")}</span> — {t("tagline")}
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>Pradhan Mantri Mudra / PMEGP / Stand-Up India</span>
          <span>•</span>
          <span>Open Data & Deterministic Financial Models</span>
        </div>
      </div>
    </footer>
  )
}

