import React from "react"
import type { BusinessSuggestion } from "@/types"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

interface BusinessCardProps {
  business: BusinessSuggestion
  onSelect: (business: BusinessSuggestion) => void
  onCompare?: (business: BusinessSuggestion) => void
  isSelected?: boolean
  isCompared?: boolean
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  onSelect,
  isSelected,
}) => {
  const difficultyBadge = {
    easy: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    medium: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    hard: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
  }[business.difficulty]

  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col justify-between transition-all ${
        isSelected
          ? "border-primary-600 ring-2 ring-primary-600/20 bg-primary-50/20"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="p-5 space-y-4">
        {/* Header with Title and Difficulty */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {business.sector}
            </span>
            <h3 className="font-bold text-lg text-foreground leading-snug">
              {business.name}
            </h3>
          </div>
          <span
            className={`px-2 py-0.5 text-xs font-medium border rounded-md capitalize ${difficultyBadge}`}
          >
            {business.difficulty}
          </span>
        </div>

        {/* Investment & Income Stats */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-secondary/40 border border-border rounded-md text-xs">
          <div>
            <span className="text-muted-foreground block">Typical Investment</span>
            <span className="font-bold text-foreground text-sm">
              {formatCurrency(business.investment_range[0])} - {formatCurrency(business.investment_range[1])}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Monthly Income</span>
            <span className="font-bold text-primary text-sm">
              {formatCurrency(business.monthly_income_range[0])} - {formatCurrency(business.monthly_income_range[1])}
            </span>
          </div>
        </div>

        {/* Reason / Why it suits */}
        <div className="text-xs text-muted-foreground leading-relaxed bg-secondary/30 p-2.5 rounded border border-border">
          <span className="font-semibold text-foreground block mb-0.5">Why this suits you:</span>
          {business.reason}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-5 pt-0 flex items-center gap-2 border-t border-border pt-3">
        <Button
          variant={isSelected ? "default" : "secondary"}
          size="sm"
          className="flex-1"
          onClick={() => onSelect(business)}
        >
          {isSelected ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Selected
            </>
          ) : (
            "Select This"
          )}
        </Button>
      </div>
    </div>
  )
}
