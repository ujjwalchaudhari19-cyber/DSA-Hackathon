import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"

interface Question {
  id: string
  titleKey: string
  subtitle: string
  type: "single" | "multi" | "range"
  options?: { value: string; label: string; desc?: string }[]
}

const discoveryQuestions: Question[] = [
  {
    id: "interests",
    titleKey: "discover.interests_q",
    subtitle: "Select sectors that interest you (choose one or more)",
    type: "multi",
    options: [
      { value: "dairy", label: "Dairy & Animal Husbandry", desc: "Milk production, cattle, poultry, goat farming" },
      { value: "food", label: "Food Processing & Agri", desc: "Flour mill, spice grinding, packaging, oil extraction" },
      { value: "retail", label: "Retail & Local Shop", desc: "Kirana store, mobile repair, fertilizer dealership" },
      { value: "services", label: "Services & Mechanics", desc: "Two-wheeler garage, CSC center, tailor, solar technician" },
      { value: "manufacturing", label: "Small Manufacturing", desc: "Bio-fertilizer, brick making, paper plates, garments" },
    ],
  },
  {
    id: "budget",
    titleKey: "discover.budget_q",
    subtitle: "What is your savings or self-contribution capacity?",
    type: "single",
    options: [
      { value: "micro", label: "Under ₹50,000", desc: "Low-capex micro enterprises and service counters" },
      { value: "small", label: "₹50,000 - ₹2,00,000", desc: "Small livestock units, mini processing units, retail" },
      { value: "medium", label: "₹2,00,000 - ₹5,00,000", desc: "Commercial dairy (5+ cattle), agro-processing, machinery" },
      { value: "large", label: "Above ₹5,00,000", desc: "Scale manufacturing or warehousing" },
    ],
  },
  {
    id: "space",
    titleKey: "discover.space_q",
    subtitle: "Where will the business operate?",
    type: "single",
    options: [
      { value: "home", label: "At home / Yard", desc: "No extra rent needed" },
      { value: "own_land", label: "Own agricultural land", desc: "Ideal for sheds, units, livestock" },
      { value: "rented_shop", label: "Rented commercial shop", desc: "Marketroad, village square, town center" },
    ],
  },
  {
    id: "utilities",
    titleKey: "discover.electricity_q",
    subtitle: "Essential infrastructure available at location",
    type: "multi",
    options: [
      { value: "electricity", label: "Reliable 1-Phase / 3-Phase Power", desc: "Needed for machinery and cold storage" },
      { value: "water", label: "Adequate Borewell / Municipal Water", desc: "Essential for livestock and food production" },
      { value: "road", label: "Paved Road Access", desc: "Easy transport for feed, raw material, and buyers" },
    ],
  },
]

export const DiscoverPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { discovery, setDiscovery } = useAppStore()

  const [step, setStep] = useState(0)
  const currentQ = discoveryQuestions[step]

  // Local state for answers
  const [selectedInterests, setSelectedInterests] = useState<string[]>(discovery.interests || ["dairy"])
  const [selectedBudget, setSelectedBudget] = useState<string>("small")
  const [selectedSpace, setSelectedSpace] = useState<string>(discovery.space || "own_land")
  const [selectedUtilities, setSelectedUtilities] = useState<string[]>(["electricity", "water"])

  const handleNext = () => {
    if (step < discoveryQuestions.length - 1) {
      setStep(step + 1)
    } else {
      // Save to store and proceed to results
      setDiscovery({
        interests: selectedInterests,
        space: selectedSpace,
        electricity: selectedUtilities.includes("electricity"),
        water: selectedUtilities.includes("water"),
      })
      navigate("/discover/results")
    }
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step Tracker Header */}
      <div className="flex items-center justify-between text-xs text-earth-600 font-semibold uppercase tracking-wider">
        <span>Question {step + 1} of {discoveryQuestions.length}</span>
        <span>{Math.round(((step + 1) / discoveryQuestions.length) * 100)}% Completed</span>
      </div>

      <div className="w-full bg-earth-200 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${((step + 1) / discoveryQuestions.length) * 100}%` }}
        />
      </div>

      {/* Main Question Card */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-bold text-earth-900">
              {t(currentQ.titleKey)}
            </h2>
            <p className="text-sm text-earth-600">{currentQ.subtitle}</p>
          </div>

          {/* Options Display */}
          <div className="space-y-2.5">
            {currentQ.options?.map((opt) => {
              const isSelected =
                currentQ.id === "interests"
                  ? selectedInterests.includes(opt.value)
                  : currentQ.id === "budget"
                  ? selectedBudget === opt.value
                  : currentQ.id === "space"
                  ? selectedSpace === opt.value
                  : selectedUtilities.includes(opt.value)

              const toggleOption = () => {
                if (currentQ.id === "interests") {
                  setSelectedInterests((prev) =>
                    prev.includes(opt.value)
                      ? prev.filter((i) => i !== opt.value)
                      : [...prev, opt.value]
                  )
                } else if (currentQ.id === "budget") {
                  setSelectedBudget(opt.value)
                } else if (currentQ.id === "space") {
                  setSelectedSpace(opt.value)
                } else if (currentQ.id === "utilities") {
                  setSelectedUtilities((prev) =>
                    prev.includes(opt.value)
                      ? prev.filter((i) => i !== opt.value)
                      : [...prev, opt.value]
                  )
                }
              }

              return (
                <div
                  key={opt.value}
                  onClick={toggleOption}
                  className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center flex-shrink-0 border ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border bg-card"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-semibold text-earth-900 text-sm">
                      {opt.label}
                    </div>
                    {opt.desc && (
                      <div className="text-xs text-earth-600">{opt.desc}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Nav Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-earth-100">
            <Button
              variant="outline"
              disabled={step === 0}
              onClick={handlePrev}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("common.back")}</span>
            </Button>

            <Button onClick={handleNext} className="flex items-center gap-1.5 font-semibold">
              <span>{step === discoveryQuestions.length - 1 ? "Find Businesses" : t("common.next")}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

