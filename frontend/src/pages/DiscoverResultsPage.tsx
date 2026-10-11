import React from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { BusinessCard } from "@/components/discover/BusinessCard"
import { Button } from "@/components/ui/button"
import type { BusinessSuggestion } from "@/types"
import { contentByLang } from "@/data/localizedContent"
import { ArrowLeft } from "lucide-react"

export const DiscoverResultsPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setIdea, lang } = useAppStore()

  const currentContent = contentByLang[lang] || contentByLang.en
  const suggestions = currentContent.suggestions

  const handleSelect = (s: BusinessSuggestion) => {
    setIdea({
      business_type: s.name,
      scale: "small",
      details: `${s.name} in selected district. Estimated initial setup under standard scale.`,
    })
    navigate("/profile")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/15 border border-primary/25 px-2.5 py-1 rounded-md mb-2">
            <span>
              {lang === "mr"
                ? "स्थानिक ग्रामीण व्यवसाय सूचीतून निवडलेले"
                : lang === "hi"
                ? "स्थानीय ग्रामीण कैटलॉग द्वारा सत्यापित"
                : "Filtered from Local Rural Catalog"}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("discover.results_title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {lang === "mr"
              ? "तुमची जागा, भांडवल क्षमता आणि तालुक्यातील बाजारपेठेच्या मागणीनुसार क्रमवारी."
              : lang === "hi"
              ? "आपकी पूंजी, भूमि एवं स्थानीय मांग के आधार पर शीर्ष चयनित व्यवसाय।"
              : "Ranked based on your space, initial capital capacity, and district market demand."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/discover")}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("common.back")}</span>
          </Button>
        </div>
      </div>

      {/* Suggestion Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {suggestions.map((biz) => {
          return (
            <BusinessCard
              key={biz.name}
              business={biz}
              onSelect={handleSelect}
            />
          )
        })}
      </div>
    </div>
  )
}
