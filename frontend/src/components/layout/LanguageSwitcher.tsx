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
    <div className="flex items-center gap-1.5 bg-secondary p-1 rounded-md border border-border">
      <div className="px-2 text-muted-foreground flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
        <Languages className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex gap-1">
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => handleChange(l.code)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
              lang === l.code
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-foreground hover:bg-muted"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

