import React from "react"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import type { Lang } from "@/types"
import { Languages } from "lucide-react"

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useAppStore()
  const { i18n } = useTranslation()

  const languages: { code: Lang; label: string; script: string }[] = [
    { code: "en", label: "English", script: "EN" },
    { code: "hi", label: "हिन्दी", script: "HI" },
    { code: "mr", label: "मराठी", script: "MR" },
  ]

  const handleChange = (newLang: Lang) => {
    setLang(newLang)
    i18n.changeLanguage(newLang)
  }

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-secondary p-1 sm:gap-1.5">
      <div className="hidden px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:flex sm:items-center sm:gap-1">
        <Languages className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex gap-0.5 sm:gap-1">
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => handleChange(l.code)}
            aria-label={l.label}
            className={`rounded px-2 py-1.5 text-xs font-medium transition-all cursor-pointer sm:px-3 ${
              lang === l.code
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <span className="sm:hidden">{l.script}</span><span className="hidden sm:inline">{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

