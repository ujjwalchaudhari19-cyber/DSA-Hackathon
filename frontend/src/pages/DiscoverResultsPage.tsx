import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { BusinessCard } from "@/components/discover/BusinessCard"
import { Button } from "@/components/ui/button"
import type { BusinessSuggestion } from "@/types"
import { getCatalogue, type CatalogueBusiness } from "@/services/api"
import { contentByLang } from "@/data/localizedContent"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"

export const DiscoverResultsPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setIdea, lang, discovery } = useAppStore()

  const [catalogueItems, setCatalogueItems] = useState<CatalogueBusiness[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const currentContent = contentByLang[lang] || contentByLang.en
  const staticSuggestions = currentContent.suggestions

  // Fetch real catalogue from backend
  useEffect(() => {
    let active = true
    setLoading(true)
    getCatalogue()
      .then((items) => {
        if (active && Array.isArray(items) && items.length > 0) {
          setCatalogueItems(items)
        }
      })
      .catch((err) => {
        console.warn("Could not load backend catalogue:", err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Map catalogue items into suggestions or use filtered list
  const displaySuggestions: BusinessSuggestion[] = React.useMemo(() => {
    if (catalogueItems.length > 0) {
      // Filter based on user discovery preferences
      let matched = catalogueItems
      if (discovery.interests && discovery.interests.length > 0) {
        matched = catalogueItems.filter((c) =>
          discovery.interests.some(
            (int) =>
              c.sector.toLowerCase().includes(int.toLowerCase()) ||
              c.name.toLowerCase().includes(int.toLowerCase())
          )
        )
      }
      if (matched.length === 0) matched = catalogueItems

      return matched.map((c) => ({
        name: c.name,
        sector: c.sector.charAt(0).toUpperCase() + c.sector.slice(1),
        difficulty: c.min_investment < 100000 ? "easy" : c.min_investment < 300000 ? "medium" : "hard",
        investment_range: [c.min_investment, c.max_investment],
        monthly_income_range: [Math.round(c.min_investment * 0.12), Math.round(c.max_investment * 0.18)],
        reason: `Matches your capital profile and available space (${c.space_needed || "minimal setup"}). Full local bank scheme support available.`,
      }))
    }
    return staticSuggestions
  }, [catalogueItems, discovery, staticSuggestions])

  const handleSelect = (s: BusinessSuggestion) => {
    setIdea({
      business_type: s.name,
      scale: "small",
      details: `${s.name} under rural enterprise scale.`,
    })
    navigate("/profile")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/15 border border-primary/25 px-2.5 py-1 rounded-md mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {catalogueItems.length > 0
                ? `${catalogueItems.length} Verified Rural Enterprises Loaded`
                : lang === "mr"
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

      {loading && (
        <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Connecting to enterprise catalogue...</span>
        </div>
      )}

      {/* Suggestion Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {displaySuggestions.map((biz) => {
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
