import React from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Scale, Trophy } from "lucide-react"

export const ComparePage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { clearCompare, lang } = useAppStore()

  const comparisonLabels = {
    en: {
      title: "Business Side-by-Side Comparison",
      subtitle: "Compare risk, capital requirement, and break-even pace across top rural enterprise options.",
      reset: "Reset Selection",
      addAnother: "+ Add Another Idea",
      metricCol: "Evaluation Metric",
      bestFitBadge: "Best Overall Fit",
      dairyTitle: "Dairy Unit (4 Cows)",
      flourTitle: "Flour & Spice Mill",
      oilTitle: "Edible Oil Expeller",
      metrics: {
        invest: "Initial Investment",
        gap: "Funding Gap (from ₹50k)",
        profit: "Monthly Net Profit",
        emi: "Monthly Loan EMI (36m)",
        breakeven: "Break-even Timeline",
        score: "Feasibility Score",
        risk: "Primary Risk",
      },
      risks: {
        dairy: "Dry fodder price fluctuation",
        flour: "3-phase power outages",
        oil: "Raw oilseed seasonality",
      },
      verdictTitle: "AI Advisor Verdict on Comparison:",
      verdictText:
        "While the Flour & Spice Mill requires slightly lower capex and breaks even fastest, the 4-Cow Dairy Unit produces 33% higher monthly net income with guaranteed daily cooperative collection, making it the most resilient option for your district.",
    },
    hi: {
      title: "व्यवसायों की आमने-सामने तुलना",
      subtitle: "जोखिम, पूंजी की आवश्यकता और लाभ वापसी के समय के आधार पर शीर्ष ग्रामीण व्यवसायों की तुलना करें।",
      reset: "पुनर्स्थापित करें",
      addAnother: "+ अन्य व्यवसाय जोड़ें",
      metricCol: "तुलना मापदंड",
      bestFitBadge: "सर्वश्रेष्ठ समग्र विकल्प",
      dairyTitle: "डेयरी इकाई (4 गायें)",
      flourTitle: "आटा व मसाला पिसाई मिल",
      oilTitle: "खाद्य तेल एक्सपेलर मिल",
      metrics: {
        invest: "प्रारंभिक परियोजना निवेश",
        gap: "ऋण आवश्यकता (₹50,000 बचत बाद)",
        profit: "मासिक शुद्ध लाभ",
        emi: "मासिक बैंक EMI (36 माह)",
        breakeven: "पूंजी वापसी समय (ब्रेक-ईवन)",
        score: "व्यवहार्यता स्कोर",
        risk: "मुख्य परिचालन जोखिम",
      },
      risks: {
        dairy: "सूखे चारे की कीमतों में उतार-चढ़ाव",
        flour: "3-फेज बिजली आपूर्ति में रुकावट",
        oil: "तिलहन बीजों की मौसमी उपलब्धता",
      },
      verdictTitle: "तुलना पर AI व्यापार सलाहकार का निष्कर्ष:",
      verdictText:
        "यद्यपि आटा व मसाला मिल में पूंजी कम लगती है और ब्रेक-ईवन जल्दी होता है, फिर भी 4 गायों की डेयरी इकाई से 33% अधिक शुद्ध मासिक आय प्राप्त होती है और दैनिक दूध बिक्री सुनिश्चित रहती है, जिससे यह आपके क्षेत्र के लिए सबसे टिकाऊ विकल्प बनता है।",
    },
    mr: {
      title: "व्यवसायांची समोरासमोर तुलना",
      subtitle: "भांडवल, नफा आणि कर्ज परतफेडीचा वेग या निकषांवर ग्रामीण व्यवसायांची तुलना करा.",
      reset: "पुन्हा निवडा",
      addAnother: "+ नवीन व्यवसाय जोडा",
      metricCol: "मूल्यांकन निकष",
      bestFitBadge: "एकूण सर्वोत्तम पर्याय",
      dairyTitle: "दुग्धव्यवसाय (4 गाई)",
      flourTitle: "मसाला व धान्य गिरणी",
      oilTitle: "लाकडी घाणा तेल निर्मिती",
      metrics: {
        invest: "सुरुवातीची एकूण गुंतवणूक",
        gap: "कर्ज आवश्यकता (₹50k बचत वजा जाता)",
        profit: "मासिक निव्वळ नफा",
        emi: "मासिक बँक हप्ता (36 महिने)",
        breakeven: "भांडवल परतावा काळ",
        score: "व्यवहार्यता निर्देशांक",
        risk: "प्रमुख व्यवसाय जोखीम",
      },
      risks: {
        dairy: "सुक्या चाऱ्याच्या दरातील चढ-उतार",
        flour: "3-फेज वीज पुरवठ्यातील व्यत्यय",
        oil: "तेलबियांची हंगामी आवक",
      },
      verdictTitle: "तुलनेवरील AI सल्लागाराचा निष्कर्ष:",
      verdictText:
        "धान्य गिरणीसाठी भांडवल कमी लागत असले तरी, 4 गाईंच्या दुग्धव्यवसायातून 33% जास्त निव्वळ मासिक नफा मिळतो आणि दूध संकलनाची दैनिक हमी असते, त्यामुळे तुमच्या तालुक्यासाठी हा व्यवसाय सर्वाधिक फायदेशीर ठरतो.",
    },
  }[lang] || {
    title: "Business Side-by-Side Comparison",
    subtitle: "Compare risk, capital requirement, and break-even pace across top rural enterprise options.",
    reset: "Reset Selection",
    addAnother: "+ Add Another Idea",
    metricCol: "Evaluation Metric",
    bestFitBadge: "Best Overall Fit",
    dairyTitle: "Dairy Unit (4 Cows)",
    flourTitle: "Flour & Spice Mill",
    oilTitle: "Edible Oil Expeller",
    metrics: {
      invest: "Initial Investment",
      gap: "Funding Gap (from ₹50k)",
      profit: "Monthly Net Profit",
      emi: "Monthly Loan EMI (36m)",
      breakeven: "Break-even Timeline",
      score: "Feasibility Score",
      risk: "Primary Risk",
    },
    risks: {
      dairy: "Dry fodder price fluctuation",
      flour: "3-phase power outages",
      oil: "Raw oilseed seasonality",
    },
    verdictTitle: "AI Advisor Verdict on Comparison:",
    verdictText:
      "While the Flour & Spice Mill requires slightly lower capex and breaks even fastest, the 4-Cow Dairy Unit produces 33% higher monthly net income with guaranteed daily cooperative collection, making it the most resilient option for your district.",
  }

  const comparisonData = [
    {
      metric: comparisonLabels.metrics.invest,
      dairy: formatCurrency(286000),
      flourMill: formatCurrency(210000),
      oilExpeller: formatCurrency(420000),
      best: "flourMill",
    },
    {
      metric: comparisonLabels.metrics.gap,
      dairy: formatCurrency(236000),
      flourMill: formatCurrency(160000),
      oilExpeller: formatCurrency(370000),
      best: "flourMill",
    },
    {
      metric: comparisonLabels.metrics.profit,
      dairy: "₹28,000 / mo",
      flourMill: "₹21,000 / mo",
      oilExpeller: "₹38,000 / mo",
      best: "oilExpeller",
    },
    {
      metric: comparisonLabels.metrics.emi,
      dairy: "₹7,564 / mo",
      flourMill: "₹5,128 / mo",
      oilExpeller: "₹11,852 / mo",
      best: "flourMill",
    },
    {
      metric: comparisonLabels.metrics.breakeven,
      dairy: lang === "mr" ? "14 महिने" : lang === "hi" ? "14 महीने" : "14 Months",
      flourMill: lang === "mr" ? "11 महिने" : lang === "hi" ? "11 महीने" : "11 Months",
      oilExpeller: lang === "mr" ? "18 महिने" : lang === "hi" ? "18 महीने" : "18 Months",
      best: "flourMill",
    },
    {
      metric: comparisonLabels.metrics.score,
      dairy: "71 / 100",
      flourMill: "68 / 100",
      oilExpeller: "62 / 100",
      best: "dairy",
    },
    {
      metric: comparisonLabels.metrics.risk,
      dairy: comparisonLabels.risks.dairy,
      flourMill: comparisonLabels.risks.flour,
      oilExpeller: comparisonLabels.risks.oil,
      best: "flourMill",
    },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary-700" />
            <span>{comparisonLabels.title}</span>
          </h2>
          <p className="text-sm text-earth-600">
            {comparisonLabels.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearCompare}
            className="text-xs border-border"
          >
            {comparisonLabels.reset}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/discover")}
            className="text-xs"
          >
            {comparisonLabels.addAnother}
          </Button>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="border border-border rounded-lg bg-card overflow-x-auto shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-muted/60 border-b border-border text-foreground text-sm">
              <th className="p-4 font-bold w-1/4">{comparisonLabels.metricCol}</th>
              <th className="p-4 font-bold text-center border-l border-border bg-primary/10">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-primary text-white text-xs font-bold mb-1">
                  <Trophy className="w-3 h-3" />
                  <span>{comparisonLabels.bestFitBadge}</span>
                </div>
                <div className="text-foreground">{comparisonLabels.dairyTitle}</div>
              </th>
              <th className="p-4 font-bold text-center border-l border-border text-foreground">
                {comparisonLabels.flourTitle}
              </th>
              <th className="p-4 font-bold text-center border-l border-border text-foreground">
                {comparisonLabels.oilTitle}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {comparisonData.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <td className="p-3.5 font-semibold text-foreground bg-muted/20">
                  {row.metric}
                </td>

                <td className={`p-3.5 text-center border-l border-border ${row.best === "dairy" ? "font-bold text-primary bg-primary/10" : ""}`}>
                  {row.dairy}
                </td>

                <td className={`p-3.5 text-center border-l border-border ${row.best === "flourMill" ? "font-bold text-primary bg-primary/10" : ""}`}>
                  {row.flourMill}
                </td>

                <td className={`p-3.5 text-center border-l border-border ${row.best === "oilExpeller" ? "font-bold text-primary bg-primary/10" : ""}`}>
                  {row.oilExpeller}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rationale Callout */}
      <div className="p-4 rounded-lg bg-card border border-border text-xs text-foreground space-y-1 shadow-xs">
        <span className="font-bold text-foreground block">{comparisonLabels.verdictTitle}</span>
        <p className="leading-relaxed text-muted-foreground">
          {comparisonLabels.verdictText}
        </p>
      </div>
    </div>
  )
}
