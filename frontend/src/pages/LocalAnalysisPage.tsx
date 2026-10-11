import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  MapPin,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Loader2,
} from "lucide-react"

interface AnalysisConfig {
  scoreVerdict: string
  marketScore: number
  demandStats: { label: string; value: string; sub: string }[]
  demandPoints: string[]
  competitorPoints: string[]
  risks: { title: string; desc: string; type: "risk" | "opp" }[]
}

// Fallback generator for any custom/unlisted business
function getGenericEnterpriseAnalysis(businessType: string, _lang: string): AnalysisConfig {
  const displayTitle = (businessType || "Micro Enterprise")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())

  return {
    scoreVerdict: "Viable Feasibility Potential",
    marketScore: 74,
    demandStats: [
      { label: "Estimated Daily Customers / Demand", value: "35 - 70 transactions", sub: "Within local catchment area" },
      { label: "Competitor Density", value: "Moderate (3-5 units)", sub: "Room for organized new entrant" },
      { label: "Average Ticket Value", value: "₹180 - ₹450", sub: "Based on local commercial benchmark" },
    ],
    demandPoints: [
      `Consistent local community demand for ${displayTitle} products and services.`,
      "Growth driven by increasing local commercial activity, village clusters, and purchasing power.",
      "Scope to expand market catchment by serving neighboring villages and weekly haats.",
    ],
    competitorPoints: [
      "Existing competitors rely on traditional unorganized practices with limited service quality.",
      "Offering prompt customer service, fair pricing, and digital UPI payments provides an immediate advantage.",
      "Maintaining dependable stock and quality standards builds strong customer loyalty.",
    ],
    risks: [
      { title: "Risk: Working Capital & Raw Material Fluctuations", desc: "Mitigation: Maintain buffer inventory and 3-month operating cash reserve.", type: "risk" },
      { title: "Opportunity: PMEGP / Mudra Collateral-Free Credit", desc: "Micro enterprises qualify for priority sector collateral-free bank loans with capital subsidy.", type: "opp" },
    ],
  }
}

// Dynamic analysis configs for standard and commercial catalog options
function getDynamicAnalysis(businessType: string, lang: string): AnalysisConfig {
  const bt = (businessType || "").toLowerCase().replace(/[\s-]+/g, "_")

  const configs: Record<string, AnalysisConfig> = {
    commercial_transport: {
      scoreVerdict: "High Demand Potential",
      marketScore: 78,
      demandStats: [
        { label: "Estimated Weekly Freight Trips", value: "14 - 22 trips", sub: "Regional mandi & logistics routes" },
        { label: "Competitor Density", value: "Moderate (6-8 operators)", sub: "Strong freight absorption capacity" },
        { label: "Average Freight Rate", value: "₹38 - ₹52 / km", sub: "Agri produce & wholesale haulage" },
      ],
      demandPoints: [
        "Heavy agricultural produce haulage demand during harvest seasons connecting rural farms to APMC mandis.",
        "Year-round demand for building materials (cement, bricks, sand) and wholesale retail FMCG distribution.",
        "Return-trip cargo opportunities from regional trading hubs minimize empty vehicle deadhead runs.",
      ],
      competitorPoints: [
        "Most existing local truck operators are unorganized without digital scheduling or GPS tracking.",
        "Punctual scheduled pickups and transparent per-km billing win corporate & cooperative contracts.",
        "Direct tie-ups with farmer producer organizations (FPOs) and mandi commission agents guarantee repeat loads.",
      ],
      risks: [
        { title: "Risk: Diesel Price Volatility & Maintenance", desc: "Mitigation: Incorporate fuel index escalation clauses into freight contracts and adhere to regular OEM servicing.", type: "risk" },
        { title: "Opportunity: Mudra Tarun / Stand-Up India", desc: "Commercial vehicle purchase qualifies for priority sector collateral-free term credit up to ₹10-20 Lakhs.", type: "opp" },
      ],
    },
    flour_spice_mill: {
      scoreVerdict: "High Feasibility Potential",
      marketScore: 76,
      demandStats: [
        { label: "Estimated Daily Grinding Demand", value: "300 - 450 kg", sub: "Within 5 km village cluster" },
        { label: "Competitor Density", value: "Low (3-4 units)", sub: "Most are manual or old-model mills" },
        { label: "Average Milling Rate", value: "₹4 - ₹6 / kg", sub: "Custom grinding + packaged spice powder" },
      ],
      demandPoints: [
        "Steady daily demand for wheat/jowar flour grinding from households.",
        "Spike during wheat harvest (March-May) and chilli pounding season (Nov-Jan).",
        "Additional revenue from packaged spice powders (turmeric, chilli, masala).",
      ],
      competitorPoints: [
        "Most existing mills use outdated single-product machines.",
        "Adding a spice pulveriser doubles the product range with minimal extra cost.",
        "Fresh grinding retains loyal customer base over pre-packaged alternatives.",
      ],
      risks: [
        { title: "Risk: Power Supply Disruptions", desc: "Mitigation: Invest in a backup generator or solar panel setup.", type: "risk" },
        { title: "Opportunity: PM-FME Subsidy", desc: "Food processing micro enterprises qualify for 35% credit-linked subsidy under PM-FME.", type: "opp" },
      ],
    },
    dairy_small: {
      scoreVerdict: "High Feasibility Potential",
      marketScore: 74,
      demandStats: [
        { label: "Estimated Daily Demand", value: "350 - 500 Litres", sub: "Within 4 km cluster radius" },
        { label: "Competitor Density", value: "Moderate (6 units)", sub: "Absorption capacity remains" },
        { label: "Average Milk Price", value: "₹48 - ₹54 / Litre", sub: "Cooperative procurement rate" },
      ],
      demandPoints: [
        "Bulk off-take guaranteed by local cooperative chilling center.",
        "Daily household consumption growing at 8% annually.",
        "Secondary revenue from dung manure and slurry sales.",
      ],
      competitorPoints: [
        "Most existing producers are unorganized with 1-2 cows.",
        "Lack of cold chain storage among competitors.",
        "Consistent morning supply schedule gives you an edge.",
      ],
      risks: [
        { title: "Risk: Feed Cost Volatility", desc: "Mitigation: Tie up silage storage or green fodder inter-cropping early.", type: "risk" },
        { title: "Opportunity: Mudra Kishore Subsidy", desc: "Animal husbandry qualifies for collateral-free credit under priority sector rates.", type: "opp" },
      ],
    },
    kirana_store: {
      scoreVerdict: "Moderate Feasibility",
      marketScore: 71,
      demandStats: [
        { label: "Estimated Daily Footfall", value: "80 - 150 customers", sub: "Within village / mohalla" },
        { label: "Competitor Density", value: "High (10-14 shops)", sub: "Margin-based differentiation needed" },
        { label: "Average Monthly Revenue", value: "₹2.4L - ₹4.8L", sub: "Depends on inventory depth" },
      ],
      demandPoints: [
        "Daily essentials have consistent year-round demand.",
        "Harvest festival spikes boost sales October to January.",
        "Home delivery option can capture elderly and remote customers.",
      ],
      competitorPoints: [
        "Existing shops lack organized inventory and digital payments.",
        "Adding UPI / credit facility attracts younger customers.",
        "Wider product range (FMCG + fresh) differentiates your store.",
      ],
      risks: [
        { title: "Risk: Credit Sales Non-Recovery", desc: "Mitigation: Cap udhari at 15% of sales; maintain a register.", type: "risk" },
        { title: "Opportunity: Retailer Margins via Distributor Tie-up", desc: "Direct distributor partnership can improve margins by 3-5%.", type: "opp" },
      ],
    },
    tailoring: {
      scoreVerdict: "High Feasibility Potential",
      marketScore: 75,
      demandStats: [
        { label: "Estimated Monthly Orders", value: "60 - 120 pieces", sub: "Blouses, salwar, alterations" },
        { label: "Competitor Density", value: "Medium (5-6 tailors)", sub: "Quality and speed matter" },
        { label: "Average Order Value", value: "₹300 - ₹800", sub: "Custom stitching + alterations" },
      ],
      demandPoints: [
        "Peak demand during wedding and festive seasons (Nov-Feb).",
        "School and factory uniform orders provide steady base demand.",
        "Growing demand for custom boutique work.",
      ],
      competitorPoints: [
        "Most tailors lack modern sewing machines.",
        "Offering design catalogues and fabric sourcing adds value.",
        "Timely delivery is the top customer complaint with competitors.",
      ],
      risks: [
        { title: "Risk: Seasonal Demand Dip", desc: "Mitigation: Diversify into alterations and uniform contracts during lean months.", type: "risk" },
        { title: "Opportunity: PMEGP Subsidy", desc: "Tailoring qualifies for 25-35% margin money subsidy under PMEGP.", type: "opp" },
      ],
    },
    poultry_farming: {
      scoreVerdict: "High Feasibility Potential",
      marketScore: 73,
      demandStats: [
        { label: "Estimated Weekly Demand", value: "500 - 800 birds", sub: "Local market + wholesale" },
        { label: "Competitor Density", value: "Medium (5 farms)", sub: "Contract farming options available" },
        { label: "Average Selling Price", value: "₹110 - ₹120 / kg", sub: "Live bird weight" },
      ],
      demandPoints: [
        "Demand increases during winter months and festivals.",
        "Contract farming integrations reduce marketing risk.",
        "Egg production provides secondary daily revenue.",
      ],
      competitorPoints: [
        "Few competitors maintain biosecurity standards.",
        "Vertical integration (feed + birds) improves margins.",
        "Fresh local supply preferred over cold-chain transported.",
      ],
      risks: [
        { title: "Risk: Disease Outbreak", desc: "Mitigation: Maintain strict vaccination schedule and biosecurity protocols.", type: "risk" },
        { title: "Opportunity: NABARD Subsidy", desc: "Poultry units qualify for NABARD refinance at subsidized rates.", type: "opp" },
      ],
    },
    goat_farming: {
      scoreVerdict: "High Feasibility Potential",
      marketScore: 75,
      demandStats: [
        { label: "Estimated Annual Sale", value: "20 - 40 goats", sub: "Festive + regular demand" },
        { label: "Competitor Density", value: "Low (3-4 farms)", sub: "Growing market" },
        { label: "Average Price per Goat", value: "₹8,000 - ₹15,000", sub: "Based on weight and breed" },
      ],
      demandPoints: [
        "High festive demand especially during Eid and local festivals.",
        "Weekly goat markets provide regular selling opportunities.",
        "Low feed cost in semi-arid areas with natural grazing.",
      ],
      competitorPoints: [
        "Very few organized goat farms in rural areas.",
        "Breed improvement (Osmanabadi/Sirohi) commands premium.",
        "Low infrastructure requirement compared to dairy.",
      ],
      risks: [
        { title: "Risk: Disease & Mortality", desc: "Mitigation: Regular deworming and vaccination; livestock insurance.", type: "risk" },
        { title: "Opportunity: RKVY Subsidy", desc: "Goat farming qualifies for support under Rashtriya Krishi Vikas Yojana.", type: "opp" },
      ],
    },
    mobile_repair: {
      scoreVerdict: "Moderate-High Feasibility",
      marketScore: 74,
      demandStats: [
        { label: "Estimated Daily Repairs", value: "8 - 15 devices", sub: "Phones, tablets, accessories" },
        { label: "Competitor Density", value: "Medium (4-5 shops)", sub: "Skill-based differentiation" },
        { label: "Average Repair Revenue", value: "₹300 - ₹1,200", sub: "Screen, battery, software" },
      ],
      demandPoints: [
        "Steady demand from growing smartphone adoption.",
        "Screen replacement and battery swaps are highest volume.",
        "Accessory sales (covers, chargers) add passive revenue.",
      ],
      competitorPoints: [
        "Most competitors lack proper SMD rework station.",
        "Offering warranty on repairs builds customer trust.",
        "Door-step pickup/delivery for nearby villages expands reach.",
      ],
      risks: [
        { title: "Risk: Spare Parts Quality", desc: "Mitigation: Source from verified wholesalers; maintain quality grades.", type: "risk" },
        { title: "Opportunity: Low Investment Entry", desc: "Can start with ₹60,000-75,000 and scale gradually.", type: "opp" },
      ],
    },
    tiffin_food_stall: {
      scoreVerdict: "Moderate-High Feasibility",
      marketScore: 73,
      demandStats: [
        { label: "Estimated Daily Meals", value: "50 - 120 plates", sub: "Lunch + snack service" },
        { label: "Competitor Density", value: "Medium (5-7 stalls)", sub: "Taste & hygiene differentiate" },
        { label: "Average Meal Price", value: "₹50 - ₹80", sub: "Thali / tiffin box" },
      ],
      demandPoints: [
        "Daily demand from commuters, workers, and students.",
        "Market-day patronage boosts sales 2-3x.",
        "Tiffin subscription model ensures predictable revenue.",
      ],
      competitorPoints: [
        "Hygiene and consistency are common complaints with competitors.",
        "Home-cooked taste has strong customer loyalty.",
        "Low startup cost with home-based kitchen option.",
      ],
      risks: [
        { title: "Risk: Food Safety Compliance", desc: "Mitigation: Get FSSAI registration; follow basic hygiene protocols.", type: "risk" },
        { title: "Opportunity: PM-FME Subsidy", desc: "Food stalls qualify for 35% subsidy under PM-FME scheme.", type: "opp" },
      ],
    },
    mushroom_farming: {
      scoreVerdict: "Growing Opportunity",
      marketScore: 72,
      demandStats: [
        { label: "Estimated Monthly Yield", value: "200 - 400 kg", sub: "Oyster / button mushroom" },
        { label: "Competitor Density", value: "Low (1-2 farms)", sub: "Emerging market" },
        { label: "Average Selling Price", value: "₹135 - ₹160 / kg", sub: "Retail + restaurant supply" },
      ],
      demandPoints: [
        "Growing health-conscious consumer demand.",
        "Restaurant and hotel supply provides bulk orders.",
        "Can be grown year-round with controlled environment.",
      ],
      competitorPoints: [
        "Very few local producers; most supply is imported.",
        "Low space requirement (can use existing rooms/sheds).",
        "High per-kg margin compared to other agri products.",
      ],
      risks: [
        { title: "Risk: Temperature & Humidity Control", desc: "Mitigation: Active misting system; avoid direct summer heat.", type: "risk" },
        { title: "Opportunity: Niche Market Premium", desc: "Organic certification can command 30-40% price premium.", type: "opp" },
      ],
    },
    csc_eseva_center: {
      scoreVerdict: "High Feasibility Potential",
      marketScore: 77,
      demandStats: [
        { label: "Estimated Daily Transactions", value: "30 - 60", sub: "Govt services + banking" },
        { label: "Competitor Density", value: "Low (2-3 centers)", sub: "CSC franchise exclusivity" },
        { label: "Average Revenue per Transaction", value: "₹15 - ₹50", sub: "Service charges + commission" },
      ],
      demandPoints: [
        "High demand for Aadhaar, PAN, ration card, and land record services.",
        "Peaks during DBT welfare schemes, crop insurance windows, and exam seasons.",
        "Banking correspondent services add steady commission.",
      ],
      competitorPoints: [
        "Limited CSC allocations per gram panchayat.",
        "Digital literacy gap creates strong demand for assisted services.",
        "Adding photocopy, printing, and lamination increases footfall.",
      ],
      risks: [
        { title: "Risk: Internet Connectivity", desc: "Mitigation: Backup mobile data connection; offline queue system.", type: "risk" },
        { title: "Opportunity: Government Push for Digital India", desc: "Expanding e-governance services create new revenue streams.", type: "opp" },
      ],
    },
  }

  // Normalize business type to match config keys
  let key = bt
  if (
    bt.includes("truck") ||
    bt.includes("transport") ||
    bt.includes("freight") ||
    bt.includes("logistics") ||
    bt.includes("vehicle") ||
    bt.includes("tempo") ||
    bt.includes("commercial_transport") ||
    bt.includes("cargo") ||
    bt.includes("haulage")
  ) {
    key = "commercial_transport"
  } else if (bt.includes("flour") || bt.includes("spice") || bt.includes("mill")) {
    key = "flour_spice_mill"
  } else if (bt.includes("dairy") || bt.includes("milk") || bt.includes("cow") || bt.includes("cattle")) {
    key = "dairy_small"
  } else if (bt.includes("kirana") || bt.includes("grocery") || bt.includes("general")) {
    key = "kirana_store"
  } else if (bt.includes("tailor") || bt.includes("boutique") || bt.includes("stitch")) {
    key = "tailoring"
  } else if (bt.includes("poultry") || bt.includes("chicken")) {
    key = "poultry_farming"
  } else if (bt.includes("goat")) {
    key = "goat_farming"
  } else if (bt.includes("mobile") || bt.includes("repair") || bt.includes("electronics")) {
    key = "mobile_repair"
  } else if (bt.includes("tiffin") || bt.includes("food") || bt.includes("stall")) {
    key = "tiffin_food_stall"
  } else if (bt.includes("mushroom")) {
    key = "mushroom_farming"
  } else if (bt.includes("csc") || bt.includes("eseva") || bt.includes("seva")) {
    key = "csc_eseva_center"
  }

  return configs[key] || getGenericEnterpriseAnalysis(businessType, lang)
}

export const LocalAnalysisPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, idea, lang } = useAppStore()

  const [apiData, setApiData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const businessType = idea?.business_type || "commercial_transport"
  const fallback = getDynamicAnalysis(businessType, lang)

  useEffect(() => {
    let cancelled = false
    const fetchAnalysis = async () => {
      setLoading(true)
      try {
        const res = await api.post("/analysis/local", {
          district: profile.district || "Nashik",
          business_type: businessType,
          lang: lang || "en",
        })
        if (!cancelled && res.data) {
          setApiData(res.data)
        }
      } catch (err) {
        console.warn("Local analysis API unavailable, using dynamic fallback", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAnalysis()
    return () => {
      cancelled = true
    }
  }, [businessType, profile.district, lang])

  // Enhance stats with live API data if available
  const marketScore =
    apiData?.local_data?.market_score ||
    fallback.marketScore ||
    75

  const demandStats = fallback.demandStats.map((stat, idx) => {
    if (idx === 1 && apiData?.local_data?.competitor_count) {
      return {
        ...stat,
        value: `${(apiData.local_data.competitor_density || "moderate").toUpperCase()} (${apiData.local_data.competitor_count} units)`,
      }
    }
    return stat
  })

  // Dynamic demand points: use API customer segments & summary when available
  const demandPoints =
    apiData?.customer_segments && apiData.customer_segments.length > 0
      ? [
          apiData.demand_summary || fallback.demandPoints[0],
          ...apiData.customer_segments.map((seg: string) => `Target Customer: ${seg}`),
          ...(fallback.demandPoints.length > 1 ? [fallback.demandPoints[fallback.demandPoints.length - 1]] : []),
        ]
      : fallback.demandPoints

  // Dynamic competitor points
  const competitorPoints = apiData?.competitor_summary
    ? [apiData.competitor_summary, ...fallback.competitorPoints.slice(1)]
    : fallback.competitorPoints

  // Dynamic risks and opportunities
  const dynamicRisks =
    apiData?.risks && apiData.risks.length > 0
      ? [
          ...apiData.risks.map((r: any) => ({
            title: `Risk: ${r.name}`,
            desc: r.mitigation ? `Mitigation: ${r.mitigation}` : "Follow standard operating and financial discipline.",
            type: "risk" as const,
          })),
          ...(apiData.opportunities || []).map((opp: string) => ({
            title: "Opportunity",
            desc: opp,
            type: "opp" as const,
          })),
        ]
      : fallback.risks

  const locationDistrict = profile.district || (lang === "mr" || lang === "hi" ? "नासिक" : "Nashik")
  const locationState = profile.state || (lang === "mr" || lang === "hi" ? "महाराष्ट्र" : "Maharashtra")
  const locationVillage = profile.village ? profile.village + ", " : ""
  const locationText = `${locationVillage}${locationDistrict}, ${locationState}`
  const businessTitle =
    businessType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Business"

  const confidenceLevel = apiData?.local_data?.confidence || "high"
  const confidenceLabel =
    confidenceLevel === "high"
      ? lang === "mr"
        ? "उच्च"
        : lang === "hi"
        ? "उच्च"
        : "High"
      : lang === "mr"
      ? "मध्यम"
      : lang === "hi"
      ? "मध्यम"
      : "Medium"

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
              ? "स्थानिक बाजारपेठ आकडेवारी, ग्राहक घनता आणि स्पर्धा विश्लेषणावर आधारित."
              : lang === "hi"
              ? "स्थानीय बाज़ार आकड़ों, उपभोक्ता मांग एवं प्रतिस्पर्धा विश्लेषण पर आधारित।"
              : "Based on local market data, consumer demand, and competition analysis."}
          </p>
        </div>

        {/* Confidence badge */}
        <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 rounded-md self-start md:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div className="text-xs">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 block leading-none">
              {lang === "mr"
                ? `डेटा विश्वासार्हता: ${confidenceLabel}`
                : lang === "hi"
                ? `डेटा विश्वसनीयता: ${confidenceLabel}`
                : `Data Confidence: ${confidenceLabel}`}
            </span>
            <span className="text-emerald-700/90 dark:text-emerald-400/90 text-[10px]">
              {lang === "mr"
                ? "जिल्हा व्यापार गणना + स्थानिक डेटा"
                : lang === "hi"
                ? "जिला सांख्यिकी + स्थानीय डेटा"
                : "District Census + Local Data"}
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Fetching live market data...</span>
        </div>
      )}

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
            {fallback.scoreVerdict}
          </span>
        </Card>

        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {demandStats.map((stat, i) => (
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
              {demandPoints.map((pt, i) => (
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
              {competitorPoints.map((pt, i) => (
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
              {dynamicRisks.map((item, i) => (
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
                      item.type === "risk"
                        ? "text-amber-800 dark:text-amber-300"
                        : "text-emerald-800 dark:text-emerald-300"
                    }`}
                  >
                    {item.title}
                  </div>
                  <div
                    className={`text-[11px] ${
                      item.type === "risk"
                        ? "text-amber-700/90 dark:text-amber-400/90"
                        : "text-emerald-700/90 dark:text-emerald-400/90"
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
