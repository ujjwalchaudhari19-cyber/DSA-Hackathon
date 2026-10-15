import React from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Compass, Lightbulb, ShieldCheck, Banknote, FileCheck, Users2 } from "lucide-react"

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center space-y-12 py-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/15 text-primary border border-primary/30 rounded-md text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>{t("landing.badge_verified")}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          {t("landing.hero_title")}
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("landing.hero_subtitle")}
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            size="lg"
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-base font-semibold"
            onClick={() => navigate("/discover")}
          >
            <Compass className="w-5 h-5" />
            <span>{t("landing.cta_discover")}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-base font-semibold"
            onClick={() => navigate("/idea")}
          >
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span>{t("landing.cta_know_idea")}</span>
          </Button>
        </div>
      </div>

      {/* Feature Value Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <Card className="border-border bg-card hover:border-primary/40 transition-colors">
          <CardContent className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-md bg-secondary/50 border border-border flex items-center justify-center text-primary">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-foreground">
              {t("landing.feat1_title")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("landing.feat1_desc")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card hover:border-primary/40 transition-colors">
          <CardContent className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-md bg-secondary/50 border border-border flex items-center justify-center text-primary">
              <Banknote className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-foreground">
              {t("landing.feat2_title")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("landing.feat2_desc")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card hover:border-primary/40 transition-colors">
          <CardContent className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-md bg-secondary/50 border border-border flex items-center justify-center text-primary">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-foreground">
              {t("landing.feat3_title")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("landing.feat3_desc")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Demo Persona Card */}
      <div className="w-full bg-secondary/30 border border-border rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
            <Users2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">
              {t("landing.persona_title")}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("landing.persona_desc")}
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            navigate("/discover")
          }}
          className="border border-border"
        >
          {t("landing.persona_btn")}
        </Button>
      </div>
    </div>
  )
}
