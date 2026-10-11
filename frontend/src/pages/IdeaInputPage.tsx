import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Lightbulb, ArrowRight } from "lucide-react"

export const IdeaInputPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { idea, setIdea } = useAppStore()

  const [rawText, setRawText] = useState(idea?.details || "")
  const [scale, setScale] = useState(idea?.scale || "small")

  const handleContinue = () => {
    if (!rawText.trim()) return

    setIdea({
      business_type: rawText.split(" ")[0] || "Custom Enterprise",
      scale,
      details: rawText,
    })
    navigate("/profile")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center sm:justify-start gap-2">
          <Lightbulb className="w-6 h-6 text-amber-600" />
          <span>Describe Your Business Idea</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your business details. For example: "I want to start a 4-cow dairy farm in Sinnar village."
        </p>
      </div>

      <Card className="border-border shadow-xs">
        <CardContent className="p-6 md:p-8 space-y-6">
          {/* Text Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground font-semibold">
              <label htmlFor="idea-input">Business Description</label>
            </div>

            <textarea
              id="idea-input"
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g., A small cattle unit with 4 indigenous Gir cows, selling milk to the local dairy cooperative and producing organic manure."
              className="w-full rounded-md border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none leading-relaxed"
            />
          </div>

          {/* Scale Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">
              Planned Operational Scale
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "micro", label: "Micro / Cottage", desc: "Single person / family" },
                { id: "small", label: "Small Commercial", desc: "2-4 workers or livestock" },
                { id: "expanded", label: "Expanded Unit", desc: "Commercial setup" },
              ].map((s) => (
                <div
                  key={s.id}
                  onClick={() => setScale(s.id)}
                  className={`p-3 rounded-md border text-center cursor-pointer transition-all ${
                    scale === s.id
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border bg-card text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <div className="text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground font-normal mt-0.5">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1.5 pt-2">
            <div className="text-xs text-muted-foreground font-medium">Quick examples:</div>
            <div className="flex flex-wrap gap-2">
              {[
                "4-cow Dairy Unit in Nashik",
                "Spice and Besan grinding mill",
                "Mobile accessories and recharge shop",
                "Mini cold-press edible oil unit",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setRawText(chip)}
                  className="text-xs px-2.5 py-1 bg-secondary/50 border border-border rounded text-foreground hover:bg-secondary cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              disabled={!rawText.trim()}
              onClick={handleContinue}
              className="flex items-center gap-2 font-semibold"
            >
              <span>Continue to Profile</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

