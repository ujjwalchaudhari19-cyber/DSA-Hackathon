import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Supplier } from "@/types"
import { Users, Phone, MessageSquare, MapPin } from "lucide-react"

export const SuppliersPage: React.FC = () => {
  const { t } = useTranslation()
  const { lang } = useAppStore()
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const localizedSuppliersData: Record<
    string,
    {
      title: string
      subtitle: string
      listBtn: string
      categories: { id: string; label: string }[]
      catalogHighlightLabel: string
      priceRangeLabel: string
      moqLabel: string
      callLabel: string
      waLabel: string
      suppliers: Supplier[]
    }
  > = {
    en: {
      title: "B2B Local Supplier Connect",
      subtitle: "Curated, verified regional suppliers across Nashik cluster for inputs, livestock, and machinery.",
      listBtn: "+ List Your Business As Supplier",
      catalogHighlightLabel: "Catalog Highlights:",
      priceRangeLabel: "Price Range",
      moqLabel: "Minimum Order",
      callLabel: "Call",
      waLabel: "WhatsApp Quote",
      categories: [
        { id: "all", label: "All Categories" },
        { id: "cattle", label: "Cattle & Breeding" },
        { id: "feed", label: "Feed & Fodder" },
        { id: "machinery", label: "Equipment & Cans" },
        { id: "vet", label: "Veterinary & Medicine" },
      ],
      suppliers: [
        {
          id: "sup_1",
          name: "Sahyadri Agro-Feed & Cattle Breeders",
          category: "cattle",
          district: "Nashik (Sinnar MIDC)",
          products: ["Vaccinated Indigenous Gir Cows", "HF Cross Heifers", "Mineral Mix 25kg"],
          contact: "+91 98220 11223",
          price_band: "₹42,000 - ₹55,000 / Cow",
          moq: "1 Cow / 50 kg feed",
          rating: 4.8,
        },
        {
          id: "sup_2",
          name: "Krushi Vikas Silage & Green Fodder Hub",
          category: "feed",
          district: "Nashik (Niphad)",
          products: ["Corn Silage Bales", "Dry Lucerne Fodder", "Silage Bags"],
          contact: "+91 94231 88990",
          price_band: "₹4.50 - ₹6.00 / kg Silage",
          moq: "500 kg minimum",
          rating: 4.6,
        },
        {
          id: "sup_3",
          name: "Shree Ganesh Dairy Equipment & Stainless Works",
          category: "machinery",
          district: "Nashik (Panchavati)",
          products: ["Electric Chaff Cutters (2HP/3HP)", "SS-304 Milk Cans 40L", "Milking Machines"],
          contact: "+91 98901 44556",
          price_band: "₹18,000 - ₹32,000 / Unit",
          moq: "1 Unit",
          rating: 4.9,
        },
        {
          id: "sup_4",
          name: "Maharashtra Agro Vet Pharma & Vaccine Counter",
          category: "vet",
          district: "Nashik (Dwarka Circle)",
          products: ["FMD & Deworming Vaccines", "Calcium Gel 1L", "Cattle Mastitis Strips"],
          contact: "+91 97654 33221",
          price_band: "Wholesale MRP -15%",
          moq: "Pack of 5",
          rating: 4.7,
        },
      ],
    },
    hi: {
      title: "B2B स्थानीय आपूर्तिकर्ता नेटवर्क",
      subtitle: "पशुधन, चारा, डेयरी मशीनरी एवं कृषि इनपुट्स हेतु नासिक क्षेत्र के सत्यापित आपूर्तिकर्ता।",
      listBtn: "+ अपने व्यवसाय को आपूर्तिकर्ता के रूप में जोड़ें",
      catalogHighlightLabel: "प्रमुख उत्पाद एवं सेवाएं:",
      priceRangeLabel: "मूल्य सीमा",
      moqLabel: "न्यूनतम ऑर्डर मात्रा",
      callLabel: "कॉल करें",
      waLabel: "व्हाट्सएप कोटेशन",
      categories: [
        { id: "all", label: "सभी श्रेणियां" },
        { id: "cattle", label: "पशुधन व नस्ल सुधार" },
        { id: "feed", label: "पशु आहार व चारा" },
        { id: "machinery", label: "मशीनरी व स्टील के डिब्बे" },
        { id: "vet", label: "पशु चिकित्सा व दवाएं" },
      ],
      suppliers: [
        {
          id: "sup_1",
          name: "सह्याद्री एग्रो-फीड एवं पशु प्रजनक",
          category: "cattle",
          district: "नासिक (सिन्नर MIDC)",
          products: ["टीकाकृत स्वदेशी गीर गायें", "एचएफ क्रॉस बछड़ियां", "खनिज मिश्रण 25 किग्रा"],
          contact: "+91 98220 11223",
          price_band: "₹42,000 - ₹55,000 / गाय",
          moq: "1 गाय / 50 किग्रा आहार",
          rating: 4.8,
        },
        {
          id: "sup_2",
          name: "कृषि विकास साइलेज एवं हरा चारा हब",
          category: "feed",
          district: "नासिक (निफाड)",
          products: ["मक्का साइलेज गांठें (मुरघास)", "सूखा ल्यूसर्न चारा", "साइलेज बैग्स"],
          contact: "+91 94231 88990",
          price_band: "₹4.50 - ₹6.00 / किग्रा साइलेज",
          moq: "500 किग्रा न्यूनतम",
          rating: 4.6,
        },
        {
          id: "sup_3",
          name: "श्री गणेश डेयरी उपकरण एवं स्टील वर्क्स",
          category: "machinery",
          district: "नासिक (पंचवटी)",
          products: ["इलेक्ट्रिक कुट्टी मशीन (2HP/3HP)", "SS-304 दूध के कैन 40L", "मिल्किंग मशीन"],
          contact: "+91 98901 44556",
          price_band: "₹18,000 - ₹32,000 / यूनिट",
          moq: "1 यूनिट",
          rating: 4.9,
        },
        {
          id: "sup_4",
          name: "महाराष्ट्र एग्रो वेट फार्मा एवं वैक्सीन काउंटर",
          category: "vet",
          district: "नासिक (द्वारका सर्कल)",
          products: ["एफएमडी एवं पेट के कीड़ों के टीके", "कैल्शियम जेल 1L", "मस्टाइटिस जांच स्ट्रिप्स"],
          contact: "+91 97654 33221",
          price_band: "थोक मूल्य MRP -15%",
          moq: "5 का पैक",
          rating: 4.7,
        },
      ],
    },
    mr: {
      title: "B2B स्थानिक पुरवठादार नेटवर्क",
      subtitle: "दुभती जनावरे, पशुखाद्य, यंत्रसामग्री आणि औषधोपचारासाठी नाशिक क्लस्टरमधील अधिकृत पुरवठादार.",
      listBtn: "+ तुमचा व्यवसाय पुरवठादार म्हणून जोडा",
      catalogHighlightLabel: "प्रमुख उत्पादने व सेवा:",
      priceRangeLabel: "किंमत श्रेणी",
      moqLabel: "किमान ऑर्डर",
      callLabel: "कॉल करा",
      waLabel: "WhatsApp कोटेशन",
      categories: [
        { id: "all", label: "सर्व श्रेणी" },
        { id: "cattle", label: "गाई व पशुपालन" },
        { id: "feed", label: "पशुखाद्य व चारा" },
        { id: "machinery", label: "यंत्रसामग्री व चरव्या" },
        { id: "vet", label: "पशुवैद्यकीय औषधे" },
      ],
      suppliers: [
        {
          id: "sup_1",
          name: "सह्याद्री ॲग्रो-फीड व पशु पैदास केंद्र",
          category: "cattle",
          district: "नाशिक (सिन्नर MIDC)",
          products: ["लसीकरण झालेल्या गीर गाई", "एचएफ क्रॉस कालवडी", "मिनरल मिक्स्चर 25 किलो"],
          contact: "+91 98220 11223",
          price_band: "₹42,000 - ₹55,000 / गाय",
          moq: "1 गाय / 50 किलो खाद्य",
          rating: 4.8,
        },
        {
          id: "sup_2",
          name: "कृषी विकास मुरघास (सायलेज) केंद्र",
          category: "feed",
          district: "नाशिक (निफाड)",
          products: ["मका मुरघास बेल्स (सायलेज)", "वाळलेला लसूण घास", "सायलेज बॅग्ज"],
          contact: "+91 94231 88990",
          price_band: "₹4.50 - ₹6.00 / किलो मुरघास",
          moq: "500 किलो किमान",
          rating: 4.6,
        },
        {
          id: "sup_3",
          name: "श्री गणेश डेअरी उपकरणे व स्टील वर्क्स",
          category: "machinery",
          district: "नाशिक (पंचवटी)",
          products: ["इलेक्ट्रिक कडबा कुट्टी मशीन", "SS-304 दुधाच्या चरव्या 40L", "मिल्किंग मशीन"],
          contact: "+91 98901 44556",
          price_band: "₹18,000 - ₹32,000 / संच",
          moq: "1 नग",
          rating: 4.9,
        },
        {
          id: "sup_4",
          name: "महाराष्ट्र ॲग्रो व्हेट फार्मा व लस केंद्र",
          category: "vet",
          district: "नाशिक (द्वारका चौक)",
          products: ["लाळ्या-खुरकूत व जंतनाशक लस", "कॅल्शियम जेल 1L", "स्तनदाह तपासणी पट्ट्या"],
          contact: "+91 97654 33221",
          price_band: "घाऊक दर MRP -15%",
          moq: "5 चे पाकीट",
          rating: 4.7,
        },
      ],
    },
  }

  const current = localizedSuppliersData[lang] || localizedSuppliersData.en

  const filtered =
    selectedCategory === "all"
      ? current.suppliers
      : current.suppliers.filter((s) => s.category === selectedCategory)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-700" />
            <span>{current.title}</span>
          </h2>
          <p className="text-sm text-earth-600">
            {current.subtitle}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => alert("Supplier onboarding form open for demonstration.")}
          className="text-xs border-border self-start sm:self-auto"
        >
          {current.listBtn}
        </Button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2 pt-1">
        {current.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
              selectedCategory === c.id
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-secondary text-secondary-foreground border-border hover:bg-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Supplier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((sup) => (
          <Card key={sup.id} className="border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    {current.categories.find((c) => c.id === sup.category)?.label || sup.category}
                  </span>
                  <h3 className="font-bold text-base text-foreground mt-0.5">
                    {sup.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{sup.district}</span>
                  </div>
                </div>

                {sup.rating && (
                  <span className="px-2 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 rounded text-xs font-bold">
                    ★ {sup.rating}
                  </span>
                )}
              </div>

              {/* Products pill-free tags */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-foreground block">
                  {current.catalogHighlightLabel}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sup.products.map((p, i) => (
                    <span
                      key={i}
                      className="text-xs bg-secondary text-secondary-foreground border border-border px-2 py-0.5 rounded"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pricing & MOQ */}
              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-secondary/40 rounded border border-border">
                <div>
                  <span className="text-muted-foreground block">{current.priceRangeLabel}</span>
                  <span className="font-bold text-foreground">{sup.price_band}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{current.moqLabel}</span>
                  <span className="font-bold text-foreground">{sup.moq}</span>
                </div>
              </div>

              {/* Quick Contact Buttons */}
              <div className="pt-2 border-t border-border flex items-center gap-2">
                <a
                  href={`tel:${sup.contact}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-semibold bg-secondary hover:bg-muted text-foreground border border-border transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>{current.callLabel} {sup.contact}</span>
                </a>

                <a
                  href={`https://wa.me/919822011223?text=Interested in quotation for GramUdyam plan`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-xs font-semibold bg-primary hover:bg-primary-700 text-primary-foreground transition-colors shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{current.waLabel}</span>
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
