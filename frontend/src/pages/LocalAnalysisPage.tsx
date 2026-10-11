import React from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { contentByLang } from "@/data/localizedContent"
import {
  MapPin,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react"

export const LocalAnalysisPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, idea, lang } = useAppStore()

  const currentContent = contentByLang[lang] || contentByLang.en
  const analysis = currentContent.localAnalysis

  const marketScore = 74
  const locationDistrict = profile.district || (lang === "mr" || lang === "hi" ? "नासिक" : "Nashik")
  const locationState = profile.state || (lang === "mr" || lang === "hi" ? "महाराष्ट्र" : "Maharashtra")
  const locationVillage = profile.village ? profile.village + ", " : ""
  const locationText = `${locationVillage}${locationDistrict}, ${locationState}`
  const businessTitle =
    idea?.business_type ||
    (lang === "mr"
      ? "व्यावसायिक दुग्धव्यवसाय युनिट (4 गाई)"
      : lang === "hi"
      ? "व्यावसायिक लघु डेयरी इकाई (4 गायें)"
      : "Commercial Dairy Unit (4 Cows)")

  return (
    <div className="space-y-6">
      {/* Header and Location Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground bg-secondary/50 border border-border px-3 py-1 rounded-md mb-2">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>
              {lang === "mr" ? "स्थानिक बाजारपेठ" : lang === "hi" ? "लक्षित बाज़ार" : "Target Market"}: {locationText}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("analysis.title")}: {businessTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {lang === "mr"
              ? "स्थानिक कृषी व दूध संकलन आकडेवारी, ग्राहक घनता आणि स्पर्धा विश्लेषणावर आधारित."
              : lang === "hi"
              ? "स्थानीय व्यापार जनगणना, सहकारी संकलन नेटवर्क एवं उपभोक्ता मांग पर आधारित।"
              : "Synthesized from local trade census, cooperative milk networks, and nearby consumer density."}
          </p>
        </div>

        {/* Confidence badge */}
        <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 rounded-md self-start md:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div className="text-xs">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 block leading-none">
              {lang === "mr" ? "डेटा विश्वासार्हता: उच्च" : lang === "hi" ? "डेटा विश्वसनीयता: उच्च" : "Data Confidence: High"}
            </span>
            <span className="text-emerald-700/90 dark:text-emerald-400/90 text-[10px]">
              {lang === "mr" ? "जिल्हा कृषी गणना + सहकारी नोंदणी" : lang === "hi" ? "जिला सांख्यिकी + सहकारी रजिस्टर" : "District Census + Cooperative Registry"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Score Bar & Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border flex flex-col justify-center items-center p-6 text-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {t("analysis.market_score")}
          </span>
          <div className="text-4xl font-extrabold text-primary">
            {marketScore}
            <span className="text-lg text-muted-foreground font-normal">/100</span>
          </div>
          <span className="mt-2 text-xs font-semibold px-2 py-0.5 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-500/30">
            {analysis.scoreVerdict}
          </span>
        </Card>

        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {analysis.demandStats.map((stat, i) => (
            <Card key={i} className="border-border p-4 space-y-1">
              <span className="text-xs text-muted-foreground block">{stat.label}</span>
              <span className="text-lg font-bold text-foreground block">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.sub}</span>
            </Card>
          ))}
        </div>
      </div>

      {/* Three Detailed Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Demand & Customers */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-2 border-b border-border">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>{t("analysis.demand")}</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {analysis.demandPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Competitor Analysis */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-2 border-b border-border">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{t("analysis.competitors")}</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {analysis.competitorPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Opportunities & Risks */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-2 border-b border-border">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{t("analysis.opportunities")}</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {analysis.risks.map((item, i) => (
                <li
                  key={i}
                  className={`p-2 rounded border ${
                    item.type === "risk"
                      ? "bg-amber-500/15 border-amber-500/30"
                      : "bg-emerald-500/15 border-emerald-500/30"
                  }`}
                >
                  <div
                    className={`font-semibold ${
                      item.type === "risk" ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"
                    }`}
                  >
                    {item.title}
                  </div>
                  <div
                    className={`text-[11px] ${
                      item.type === "risk" ? "text-amber-700/90 dark:text-amber-400/90" : "text-emerald-700/90 dark:text-emerald-400/90"
                    }`}
                  >
                    {item.desc}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => navigate("/profile")}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.back")}</span>
        </Button>

        <Button
          onClick={() => navigate("/finance")}
          className="flex items-center gap-1.5 font-semibold"
        >
          <span>{t("finance.title")}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
