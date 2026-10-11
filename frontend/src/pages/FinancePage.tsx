import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { SchemeCard } from "@/components/finance/SchemeCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { calculateEmi, calculateTotalInterest } from "@/lib/emi"
import { contentByLang } from "@/data/localizedContent"
import { api } from "@/services/api"
import type { InvestmentItem, Scheme } from "@/types"
import {
  Banknote,
  Calculator,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  PlusCircle,
  Trash2,
  RotateCcw,
  Sparkles,
} from "lucide-react"

// Business type normalizer
function normalizeBusinessType(raw: string): string {
  const cleaned = (raw || "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (
    cleaned.includes("truck") ||
    cleaned.includes("transport") ||
    cleaned.includes("freight") ||
    cleaned.includes("logistics") ||
    cleaned.includes("tempo") ||
    cleaned.includes("vehicle") ||
    cleaned.includes("commercial_transport") ||
    cleaned.includes("cargo") ||
    cleaned.includes("haulage")
  ) {
    return "commercial_transport"
  }
  if (cleaned.includes("flour") || cleaned.includes("spice") || cleaned.includes("mill") || cleaned.includes("chakki")) {
    return "flour_spice_mill"
  }
  if (cleaned.includes("kirana") || cleaned.includes("grocery") || cleaned.includes("general") || cleaned.includes("store")) {
    return "kirana_store"
  }
  if (cleaned.includes("tailor") || cleaned.includes("boutique") || cleaned.includes("stitch")) {
    return "tailoring"
  }
  if (cleaned.includes("poultry") || cleaned.includes("broiler") || cleaned.includes("chicken")) {
    return "poultry_farming"
  }
  if (cleaned.includes("goat")) {
    return "goat_farming"
  }
  if (cleaned.includes("mobile") || cleaned.includes("repair") || cleaned.includes("phone")) {
    return "mobile_repair"
  }
  if (cleaned.includes("tiffin") || cleaned.includes("food") || cleaned.includes("stall") || cleaned.includes("canteen")) {
    return "tiffin_food_stall"
  }
  if (cleaned.includes("mushroom")) {
    return "mushroom_farming"
  }
  if (cleaned.includes("csc") || cleaned.includes("eseva") || cleaned.includes("seva")) {
    return "csc_eseva_center"
  }
  if (cleaned.includes("dairy") || cleaned.includes("milk") || cleaned.includes("cow") || cleaned.includes("cattle")) {
    return "dairy_small"
  }
  return "custom_enterprise"
}

// Sector-specific itemized investment templates for standard business options
const BUSINESS_ITEMS: Record<string, Record<string, InvestmentItem[]>> = {
  commercial_transport: {
    en: [
      { name: "Commercial Goods Carrier (Down payment / Vehicle Asset)", qty: 1, unit_cost: 320000, total: 320000, category: "fixed" },
      { name: "Commercial RTO Permit, National Fitness & Insurance", qty: 1, unit_cost: 42000, total: 42000, category: "fixed" },
      { name: "Fleet GPS Tracker, Cargo Tarpaulin & Securing Rigging", qty: 1, unit_cost: 15000, total: 15000, category: "fixed" },
      { name: "Working Capital: Fuel, Tolls & Operational Buffer (2 Months)", qty: 2, unit_cost: 25000, total: 50000, category: "working_capital" },
      { name: "Contingency & Tyre / Maintenance Reserve (10%)", qty: 1, unit_cost: 42700, total: 42700, category: "fixed" },
    ],
    hi: [
      { name: "कमर्शियल मालवाहक वाहन (डाउन पेमेंट / वाहन खरीद)", qty: 1, unit_cost: 320000, total: 320000, category: "fixed" },
      { name: "कमर्शियल आरटीओ परमिट, फिटनेस प्रमाणपत्र व बीमा", qty: 1, unit_cost: 42000, total: 42000, category: "fixed" },
      { name: "जीपीएस ट्रैकर, तिरपाल कवर एवं लोडिंग सामान", qty: 1, unit_cost: 15000, total: 15000, category: "fixed" },
      { name: "कार्यशील पूंजी: डीजल, टोल एवं परिचालन खर्च (2 माह)", qty: 2, unit_cost: 25000, total: 50000, category: "working_capital" },
      { name: "आकस्मिक निधि एवं टायर/रखरखाव रिजर्व (10%)", qty: 1, unit_cost: 42700, total: 42700, category: "fixed" },
    ],
    mr: [
      { name: "व्यावसायिक मालवाहतूक वाहन (डाऊन पेमेंट / वाहन खरेदी)", qty: 1, unit_cost: 320000, total: 320000, category: "fixed" },
      { name: "व्यावसायिक आरटीओ परमिट, फिटनेस व सर्वसमावेशक विमा", qty: 1, unit_cost: 42000, total: 42000, category: "fixed" },
      { name: "वाहन जीपीएस ट्रॅकर, ताडपत्री व लोडिंग साहित्य", qty: 1, unit_cost: 15000, total: 15000, category: "fixed" },
      { name: "खेळते भांडवल: डिझेल, टोल व 2 महिन्यांचा परिचालन खर्च", qty: 2, unit_cost: 25000, total: 50000, category: "working_capital" },
      { name: "आकस्मिक खर्च व टायर/देखभाल निधी (10%)", qty: 1, unit_cost: 42700, total: 42700, category: "fixed" },
    ],
  },
  flour_spice_mill: {
    en: [
      { name: "Commercial Flour Mill Machine (Atta Chakki)", qty: 1, unit_cost: 55000, total: 55000, category: "fixed" },
      { name: "Spice Pulveriser Machine", qty: 1, unit_cost: 40000, total: 40000, category: "fixed" },
      { name: "Packaging Pouches, Grain Stock & Power Deposit", qty: 2, unit_cost: 15000, total: 30000, category: "working_capital" },
      { name: "Contingency & Electrical Installation (10%)", qty: 1, unit_cost: 12500, total: 12500, category: "fixed" },
    ],
    hi: [
      { name: "कमर्शियल आटा चक्की मशीन", qty: 1, unit_cost: 55000, total: 55000, category: "fixed" },
      { name: "मसाला पल्वराइजर ग्राइंडर मशीन", qty: 1, unit_cost: 40000, total: 40000, category: "fixed" },
      { name: "पैकेजिंग पाउच, अनाज स्टॉक एवं बिजली डिपॉजिट", qty: 2, unit_cost: 15000, total: 30000, category: "working_capital" },
      { name: "आकस्मिक निधि एवं विद्युत वायरिंग (10%)", qty: 1, unit_cost: 12500, total: 12500, category: "fixed" },
    ],
    mr: [
      { name: "व्यावसायिक पीठ गिरणी मशीन (Atta Chakki)", qty: 1, unit_cost: 55000, total: 55000, category: "fixed" },
      { name: "मसाला कांडप व बारीक करणारी यंत्रसामग्री", qty: 1, unit_cost: 40000, total: 40000, category: "fixed" },
      { name: "पॅकेजिंग पाऊच, धान्य साठा व वीज अनामत", qty: 2, unit_cost: 15000, total: 30000, category: "working_capital" },
      { name: "इलेक्ट्रिक फिटिंग व आकस्मिक खर्च (10%)", qty: 1, unit_cost: 12500, total: 12500, category: "fixed" },
    ],
  },
  kirana_store: {
    en: [
      { name: "Display Shelving & Counter Fixtures", qty: 1, unit_cost: 45000, total: 45000, category: "fixed" },
      { name: "Initial Retail Grocery & FMCG Inventory", qty: 1, unit_cost: 80000, total: 80000, category: "working_capital" },
      { name: "Shop Deposit & Local Trade License", qty: 1, unit_cost: 30000, total: 30000, category: "fixed" },
      { name: "Working Capital Reserve (10%)", qty: 1, unit_cost: 15500, total: 15500, category: "working_capital" },
    ],
    hi: [
      { name: "दुकान रैक, शेल्विंग और काउंटर फर्नीचर", qty: 1, unit_cost: 45000, total: 45000, category: "fixed" },
      { name: "प्रारंभिक किराना व एफएमसीजी इन्वेंट्री", qty: 1, unit_cost: 80000, total: 80000, category: "working_capital" },
      { name: "दुकान डिपॉजिट एवं व्यापार लाइसेंस", qty: 1, unit_cost: 30000, total: 30000, category: "fixed" },
      { name: "कार्यशील पूंजी रिजर्व (10%)", qty: 1, unit_cost: 15500, total: 15500, category: "working_capital" },
    ],
    mr: [
      { name: "दुकानातील रॅक, शेल्फ व काउंटर फर्निचर", qty: 1, unit_cost: 45000, total: 45000, category: "fixed" },
      { name: "सुरुवातीचा किराणा व जीवनावश्यक माल साठा", qty: 1, unit_cost: 80000, total: 80000, category: "working_capital" },
      { name: "दुकान अनामत (डिपॉझिट) व स्थानिक परवाना", qty: 1, unit_cost: 30000, total: 30000, category: "fixed" },
      { name: "खेळत्या भांडवलाचा राखीव निधी (10%)", qty: 1, unit_cost: 15500, total: 15500, category: "working_capital" },
    ],
  },
  tailoring: {
    en: [
      { name: "Commercial Motorized Sewing Machines", qty: 2, unit_cost: 18000, total: 36000, category: "fixed" },
      { name: "Cutting Table, Ironing Setup & Furniture", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "Fabric Stock, Threads, Linings & Accessories", qty: 2, unit_cost: 15000, total: 30000, category: "working_capital" },
      { name: "Contingency & Tool Reserve (10%)", qty: 1, unit_cost: 8400, total: 8400, category: "fixed" },
    ],
    hi: [
      { name: "कमर्शियल मोटर चालित सिलाई मशीनें", qty: 2, unit_cost: 18000, total: 36000, category: "fixed" },
      { name: "कटिंग टेबल, प्रेस/इस्त्री सेटअप व फर्नीचर", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "कपड़ा सामग्री, धागे, लाइनिंग एवं एक्सेसरीज", qty: 2, unit_cost: 15000, total: 30000, category: "working_capital" },
      { name: "आकस्मिक निधि एवं सहायक उपकरण (10%)", qty: 1, unit_cost: 8400, total: 8400, category: "fixed" },
    ],
    mr: [
      { name: "व्यावसायिक मोटरयुक्त शिलाई मशिन्स", qty: 2, unit_cost: 18000, total: 36000, category: "fixed" },
      { name: "कटिंग टेबल, इस्त्री टेबल व फर्निचर", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "कापड साठा, अस्तर, दोरे व टेलरिंग साहित्य", qty: 2, unit_cost: 15000, total: 30000, category: "working_capital" },
      { name: "इतर खर्च व आकस्मिक निधी (10%)", qty: 1, unit_cost: 8400, total: 8400, category: "fixed" },
    ],
  },
  poultry_farming: {
    en: [
      { name: "Poultry Shed Construction & Brooder Setup", qty: 1, unit_cost: 60000, total: 60000, category: "fixed" },
      { name: "Commercial Broiler Chicks (Batch of 500)", qty: 1, unit_cost: 22500, total: 22500, category: "working_capital" },
      { name: "Starter Feed, Feeders, Drinkers & Vaccines", qty: 2, unit_cost: 25000, total: 50000, category: "working_capital" },
      { name: "Working Capital Reserve & Contingency (10%)", qty: 1, unit_cost: 13250, total: 13250, category: "fixed" },
    ],
    hi: [
      { name: "पोल्ट्री शेड निर्माण एवं ब्रूडर सेटअप", qty: 1, unit_cost: 60000, total: 60000, category: "fixed" },
      { name: "ब्रॉयलर चूजे (500 का बैच)", qty: 1, unit_cost: 22500, total: 22500, category: "working_capital" },
      { name: "पोल्ट्री फीड, दाना-पानी बर्तन व टीकाकरण", qty: 2, unit_cost: 25000, total: 50000, category: "working_capital" },
      { name: "कार्यशील पूंजी व आकस्मिक निधि (10%)", qty: 1, unit_cost: 13250, total: 13250, category: "fixed" },
    ],
    mr: [
      { name: "कुक्कुटपालन शेड व ब्रूडिंग व्यवस्था", qty: 1, unit_cost: 60000, total: 60000, category: "fixed" },
      { name: "ब्रॉयलर पिल्ले खरेदी (500 चा बॅच)", qty: 1, unit_cost: 22500, total: 22500, category: "working_capital" },
      { name: "पक्षी खाद्य, पाण्याची भांडी व लसीकरण", qty: 2, unit_cost: 25000, total: 50000, category: "working_capital" },
      { name: "खेळते भांडवल व आकस्मिक निधी (10%)", qty: 1, unit_cost: 13250, total: 13250, category: "fixed" },
    ],
  },
  goat_farming: {
    en: [
      { name: "Osmanabadi / Sirohi Breeding Goats (10 Females + 1 Buck)", qty: 1, unit_cost: 95000, total: 95000, category: "fixed" },
      { name: "Elevated Slatted Shed & Fencing Setup", qty: 1, unit_cost: 40000, total: 40000, category: "fixed" },
      { name: "Dry Fodder, Minerals & Vet Care Reserve", qty: 3, unit_cost: 6000, total: 18000, category: "working_capital" },
      { name: "Contingency & Insurance Buffer (10%)", qty: 1, unit_cost: 15300, total: 15300, category: "fixed" },
    ],
    hi: [
      { name: "उस्मानाबादी/सिरोही बकरियां (10 मादा + 1 नर)", qty: 1, unit_cost: 95000, total: 95000, category: "fixed" },
      { name: "लकड़ी का शेड व तारबंदी सेटअप", qty: 1, unit_cost: 40000, total: 40000, category: "fixed" },
      { name: "सूखा चारा, खनिज मिश्रण व पशु चिकित्सा", qty: 3, unit_cost: 6000, total: 18000, category: "working_capital" },
      { name: "पशु बीमा व आकस्मिक निधि (10%)", qty: 1, unit_cost: 15300, total: 15300, category: "fixed" },
    ],
    mr: [
      { name: "उस्मानाबादी / सिरोही शेळ्या (10 शेळ्या + 1 बोकड)", qty: 1, unit_cost: 95000, total: 95000, category: "fixed" },
      { name: "उंच लाकडी शेड व सुरक्षा कुंपण", qty: 1, unit_cost: 40000, total: 40000, category: "fixed" },
      { name: "सुक्या चाऱ्याचा साठा, खनिज मिश्रण व औषधे", qty: 3, unit_cost: 6000, total: 18000, category: "working_capital" },
      { name: "शेळी विमा व राखीव निधी (10%)", qty: 1, unit_cost: 15300, total: 15300, category: "fixed" },
    ],
  },
  mobile_repair: {
    en: [
      { name: "SMD Rework Station, Soldering Setup & Testing Multimeters", qty: 1, unit_cost: 25000, total: 25000, category: "fixed" },
      { name: "Display Touch Separator & Microscope Setup", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "Replacement Screens, Batteries & Fast-Moving Spares", qty: 1, unit_cost: 20000, total: 20000, category: "working_capital" },
      { name: "Work Counter, Tool Kit & Working Capital (10%)", qty: 1, unit_cost: 6300, total: 6300, category: "fixed" },
    ],
    hi: [
      { name: "एसएमडी रिवर्क स्टेशन, सोल्डरिंग व टेस्टिंग मल्टीमीटर", qty: 1, unit_cost: 25000, total: 25000, category: "fixed" },
      { name: "डिस्प्ले सेपरेटर व रिपेयरिंग माइक्रोस्कोप", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "स्मार्टफोन डिस्प्ले, बैटरी व स्पेयर पार्ट्स", qty: 1, unit_cost: 20000, total: 20000, category: "working_capital" },
      { name: "वर्क टेबल, टूलकिट व आकस्मिक निधि (10%)", qty: 1, unit_cost: 6300, total: 6300, category: "fixed" },
    ],
    mr: [
      { name: "एसएमडी सोल्डरिंग स्टेशन व टेस्टिंग मल्टिमीटर", qty: 1, unit_cost: 25000, total: 25000, category: "fixed" },
      { name: "डिस्प्ले सेपरेटर मशीन व मायक्रोस्कोप", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "मोबाईल स्क्रीन्स, बॅटरी व सुटे भाग", qty: 1, unit_cost: 20000, total: 20000, category: "working_capital" },
      { name: "कामाचा टेबल, टूलकिट व राखीव निधी (10%)", qty: 1, unit_cost: 6300, total: 6300, category: "fixed" },
    ],
  },
  tiffin_food_stall: {
    en: [
      { name: "Commercial LPG Stoves, Burners & Griddles", qty: 1, unit_cost: 20000, total: 20000, category: "fixed" },
      { name: "Stainless Steel Utensils, Cookware & Service Trays", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "Insulated Tiffin Containers & Delivery Boxes (50 sets)", qty: 1, unit_cost: 15000, total: 15000, category: "fixed" },
      { name: "Initial Grains, Cooking Oil, Spices & FSSAI (10%)", qty: 1, unit_cost: 5300, total: 5300, category: "working_capital" },
    ],
    hi: [
      { name: "कमर्शियल एलपीजी गैस चूल्हे व भट्टी सेटअप", qty: 1, unit_cost: 20000, total: 20000, category: "fixed" },
      { name: "स्टेनलेस स्टील बर्तन, कड़ाही व कुकवेयर सेट", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "इंसुलेटेड टिफिन बॉक्स व डिलीवरी बैग (50 सेट)", qty: 1, unit_cost: 15000, total: 15000, category: "fixed" },
      { name: "राशन सामग्री, खाद्य तेल, मसाले व लाइसेंस (10%)", qty: 1, unit_cost: 5300, total: 5300, category: "working_capital" },
    ],
    mr: [
      { name: "व्यावसायिक एलपीजी गॅस शेगडी व भट्टी", qty: 1, unit_cost: 20000, total: 20000, category: "fixed" },
      { name: "स्टेनलेस स्टील भांडी, कढई व स्वयंपाक साहित्य", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "इन्स्युलेटेड टिफिन डबे व पिशव्या (50 संच)", qty: 1, unit_cost: 15000, total: 15000, category: "fixed" },
      { name: "सुरुवातीचे धान्य, तेल, मसाले व अन्न परवाना (10%)", qty: 1, unit_cost: 5300, total: 5300, category: "working_capital" },
    ],
  },
  mushroom_farming: {
    en: [
      { name: "Mushroom Growing Racks, Shading Net & Misting Foggers", qty: 1, unit_cost: 35000, total: 35000, category: "fixed" },
      { name: "Paddy Straw Substrate, Certified Spawn & Polybags", qty: 2, unit_cost: 18000, total: 36000, category: "working_capital" },
      { name: "Digital Weighing Scale, Heat Sealer & Harvesting Crates", qty: 1, unit_cost: 8000, total: 8000, category: "fixed" },
      { name: "Disinfection Chemicals & Buffer Capital (10%)", qty: 1, unit_cost: 7900, total: 7900, category: "working_capital" },
    ],
    hi: [
      { name: "मशरूम ग्रोइंग रैक, शेडिंग व मिस्टिंग फॉगर", qty: 1, unit_cost: 35000, total: 35000, category: "fixed" },
      { name: "पुआल सबस्ट्रेट, स्पॉन बीज व बैग्स", qty: 2, unit_cost: 18000, total: 36000, category: "working_capital" },
      { name: "वजन कांटा, सीलिंग मशीन व क्रेट्स", qty: 1, unit_cost: 8000, total: 8000, category: "fixed" },
      { name: "स्वच्छता व आकस्मिक निधि (10%)", qty: 1, unit_cost: 7900, total: 7900, category: "working_capital" },
    ],
    mr: [
      { name: "अळंबी शेड रॅक्स, नेट व पाणी फॉगर्स", qty: 1, unit_cost: 35000, total: 35000, category: "fixed" },
      { name: "पेंढा (Substrate), स्पॉन बियाणे व पिशव्या", qty: 2, unit_cost: 18000, total: 36000, category: "working_capital" },
      { name: "वजन काटा, पॅकिंग मशीन व क्रेट्स", qty: 1, unit_cost: 8000, total: 8000, category: "fixed" },
      { name: "जंतुनाशके व राखीव निधी (10%)", qty: 1, unit_cost: 7900, total: 7900, category: "working_capital" },
    ],
  },
  csc_eseva_center: {
    en: [
      { name: "Desktop PC, UPS & High-Speed Multi-Function Printer", qty: 1, unit_cost: 48000, total: 48000, category: "fixed" },
      { name: "Biometric Fingerprint & Iris Scanner (UIDAI Spec)", qty: 1, unit_cost: 9000, total: 9000, category: "fixed" },
      { name: "Broadband Router, Lamination Machine & Office Setup", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "Digital Wallet Float & Paper Stock Float", qty: 1, unit_cost: 15000, total: 15000, category: "working_capital" },
    ],
    hi: [
      { name: "डेस्कटॉप कंप्यूटर, यूपीएस व ऑल-इन-वन प्रिंटर", qty: 1, unit_cost: 48000, total: 48000, category: "fixed" },
      { name: "बायोमेट्रिक फिंगरप्रिंट व आईरिस स्कैनर", qty: 1, unit_cost: 9000, total: 9000, category: "fixed" },
      { name: "ब्रॉडबैंड राउटर, लेमिनेशन मशीन व फर्नीचर", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "वॉलेट फ्लोट व स्टेशनरी कार्यशील पूंजी", qty: 1, unit_cost: 15000, total: 15000, category: "working_capital" },
    ],
    mr: [
      { name: "संगणक (PC), UPS व कलर मल्टी-फंक्शन प्रिंटर", qty: 1, unit_cost: 48000, total: 48000, category: "fixed" },
      { name: "बायोमेट्रिक स्कॅनर (बोटांचे ठसे व बुबुळ स्कॅनर)", qty: 1, unit_cost: 9000, total: 9000, category: "fixed" },
      { name: "वायफाय राउटर, लॅमिनेशन मशीन व कार्यालयीन टेबल", qty: 1, unit_cost: 18000, total: 18000, category: "fixed" },
      { name: "ऑनलाईन वॉलेट रक्कम व स्टेशनरी साठा", qty: 1, unit_cost: 15000, total: 15000, category: "working_capital" },
    ],
  },
  dairy_small: {
    en: [
      { name: "Indigenous Milking Cows (Gir/Sahiwal)", qty: 2, unit_cost: 65000, total: 130000, category: "fixed" },
      { name: "Cattle Shed Setup & Feed Troughs", qty: 1, unit_cost: 50000, total: 50000, category: "fixed" },
      { name: "Initial Concentrated Feed & Minerals (3 mo)", qty: 3, unit_cost: 12000, total: 36000, category: "working_capital" },
      { name: "Milk Cans, Chaff Cutter & Contingency (10%)", qty: 1, unit_cost: 21600, total: 21600, category: "fixed" },
    ],
    hi: [
      { name: "स्वदेशी दुधारू गायें (गीर/साहीवाल)", qty: 2, unit_cost: 65000, total: 130000, category: "fixed" },
      { name: "पशु शेड निर्माण व चारा चरही", qty: 1, unit_cost: 50000, total: 50000, category: "fixed" },
      { name: "पशु आहार, दाना व खनिज मिश्रण (3 माह)", qty: 3, unit_cost: 12000, total: 36000, category: "working_capital" },
      { name: "दूध के डिब्बे, कुट्टी मशीन व आकस्मिक निधि (10%)", qty: 1, unit_cost: 21600, total: 21600, category: "fixed" },
    ],
    mr: [
      { name: "दुभत्या गाई (गीर / साहिवाल - 2 गाई)", qty: 2, unit_cost: 65000, total: 130000, category: "fixed" },
      { name: "गोठा शेड व गव्हाण बांधकाम", qty: 1, unit_cost: 50000, total: 50000, category: "fixed" },
      { name: "पशुखाद्य, खनिज मिश्रण व औषध साठा (3 महिने)", qty: 3, unit_cost: 12000, total: 36000, category: "working_capital" },
      { name: "दुधाचे कॅन, कडबा कुट्टी व आकस्मिक निधी (10%)", qty: 1, unit_cost: 21600, total: 21600, category: "fixed" },
    ],
  },
}

// Dynamic description analyzer for custom and specific business setups
function analyzeDescriptionForInvestment(
  description: string,
  businessType: string,
  scale: string,
  lang: string
): InvestmentItem[] {
  const combined = `${description || ""} ${businessType || ""}`.trim().toLowerCase()
  const displayTitle = (businessType || description || "Enterprise")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())

  const scaleMultiplier = scale === "expanded" || scale === "large" ? 1.5 : (scale === "micro" ? 0.75 : 1.0)

  // 1. Commercial Transport / Truck / Logistics
  if (
    combined.includes("truck") ||
    combined.includes("transport") ||
    combined.includes("freight") ||
    combined.includes("logistics") ||
    combined.includes("vehicle") ||
    combined.includes("tempo") ||
    combined.includes("cargo") ||
    combined.includes("haulage")
  ) {
    const biz = BUSINESS_ITEMS.commercial_transport
    const baseItems = biz[lang] || biz.en
    return baseItems.map(item => ({
      ...item,
      qty: item.qty,
      unit_cost: Math.round(item.unit_cost * scaleMultiplier),
      total: Math.round(item.total * scaleMultiplier),
    }))
  }

  // 2. Standard Catalog Businesses
  const canonical = normalizeBusinessType(combined)
  if (canonical !== "custom_enterprise" && BUSINESS_ITEMS[canonical]) {
    const biz = BUSINESS_ITEMS[canonical]
    const baseItems = biz[lang] || biz.en
    return baseItems.map(item => ({
      ...item,
      qty: item.qty,
      unit_cost: Math.round(item.unit_cost * scaleMultiplier),
      total: Math.round(item.total * scaleMultiplier),
    }))
  }

  // 3. Dynamic Custom Description Analysis
  let machineryName = `${displayTitle} Core Equipment & Setup`
  let machineryCost = 85000
  let fixturesName = "Premises Fixtures, Setup & Trade Compliance"
  let fixturesCost = 28000
  let workingCapitalName = "Initial Materials / Working Capital Reserve (2 Months)"
  let workingCapitalCost = 20000

  if (
    combined.includes("baker") ||
    combined.includes("cake") ||
    combined.includes("pastry") ||
    combined.includes("bread") ||
    combined.includes("oven")
  ) {
    machineryName =
      lang === "mr"
        ? "व्यावसायिक बेकिंग ओव्हन व डोव्ह मिक्सर"
        : lang === "hi"
        ? "कमर्शियल बेकिंग ओवन व आटा मिक्सर"
        : "Bakery Commercial Oven & Spiral Dough Mixer"
    machineryCost = 95000
    fixturesName =
      lang === "mr"
        ? "काचेचे डिस्प्ले काउंटर व बेकिंग ट्रे संच"
        : lang === "hi"
        ? "ग्लास डिस्प्ले काउंटर व बेकिंग मोल्ड्स"
        : "Display Counter, Bakery Trays & FSSAI Setup"
    fixturesCost = 35000
    workingCapitalName =
      lang === "mr"
        ? "मैदा, बटर, यीस्ट व पॅकिंग साहित्य (2 महिने)"
        : lang === "hi"
        ? "मैदा, मक्खन, यीस्ट व पैकेजिंग सामग्री (2 माह)"
        : "Flour, Yeast, Butter & Packaging Material (2 Months)"
    workingCapitalCost = 25000
  } else if (
    combined.includes("weld") ||
    combined.includes("fabricat") ||
    combined.includes("iron") ||
    combined.includes("metal") ||
    combined.includes("steel")
  ) {
    machineryName =
      lang === "mr"
        ? "वेल्डिंग जनरेटर, कटर व ग्राइंडर संच"
        : lang === "hi"
        ? "वेल्डिंग मशीन, कटर व ग्राइंडर सेट"
        : "ARC/MIG Welding Machine, Cutter & Grinders"
    machineryCost = 75000
    fixturesName =
      lang === "mr"
        ? "सुरक्षा साधने, गॅस सिलिंडर व वर्कशॉप शेड"
        : lang === "hi"
        ? "सुरक्षा उपकरण, गैस सिलेंडर व शेड सेटअप"
        : "Safety Gear, Gas Cylinders & Fabrication Setup"
    fixturesCost = 35000
    workingCapitalName =
      lang === "mr"
        ? "लोखंडी पाईप्स, रॉड्स व वेल्डिंग रॉड्स साठा"
        : lang === "hi"
        ? "लोहे के पाइप, एंगल व वेल्डिंग इलेक्ट्रोड"
        : "Steel Pipes, Angles & Welding Electrodes (2 Months)"
    workingCapitalCost = 45000
  } else if (
    combined.includes("wood") ||
    combined.includes("carpent") ||
    combined.includes("furnitur")
  ) {
    machineryName =
      lang === "mr"
        ? "लाकूड रंधा (Planer) व कटर मशिनरी"
        : lang === "hi"
        ? "लकड़ी रंदा व कटर मशीन सेट"
        : "Electric Wood Planer, Circular Saw & Tool Kit"
    machineryCost = 65000
    fixturesName =
      lang === "mr"
        ? "कामाचे टेबल, क्लॅम्प्स व वर्कशॉप सुधारणा"
        : lang === "hi"
        ? "वर्कबेंच, शिकंजे व वर्कशॉप सेटअप"
        : "Heavy Workbenches, Clamps & Workshop Setup"
    fixturesCost = 25000
    workingCapitalName =
      lang === "mr"
        ? "लाकूड, प्लायवूड व हार्डवेअर साहित्य"
        : lang === "hi"
        ? "इमारती लकड़ी, प्लाईवुड व हार्डवेयर साठा"
        : "Timber, Plywood, Adhesives & Hardware (2 Months)"
    workingCapitalCost = 40000
  } else if (
    combined.includes("salon") ||
    combined.includes("parlour") ||
    combined.includes("beauty")
  ) {
    machineryName =
      lang === "mr"
        ? "हायड्रोलिक चेअर्स व हेअर स्टाइलिंग उपकरणे"
        : lang === "hi"
        ? "हाइड्रोलिक सैलून कुर्सियां व हेयर स्टाइलिंग किट"
        : "Hydraulic Salon Chairs & Hair Styling Stations"
    machineryCost = 60000
    fixturesName =
      lang === "mr"
        ? "आरसे, अंतर्गत सजावट व स्टीमर सेटअप"
        : lang === "hi"
        ? "दर्पण, इंटीरियर डेकोरेशन व स्टीमर किट"
        : "Styling Mirrors, Facial Steamer & Ambience"
    fixturesCost = 45000
    workingCapitalName =
      lang === "mr"
        ? "कॉस्मेटिक्स, शाम्पू व सौंदर्य प्रसाधने"
        : lang === "hi"
        ? "कॉस्मेटिक्स, ब्यूटी प्रोडक्ट्स व डिस्पोजेबल्स"
        : "Professional Cosmetics, Shampoos & Consumables"
    workingCapitalCost = 20000
  }

  const scaledMachinery = Math.round(machineryCost * scaleMultiplier)
  const scaledFixtures = Math.round(fixturesCost * scaleMultiplier)
  const scaledWorking = Math.round(workingCapitalCost * scaleMultiplier)
  const subtotal = scaledMachinery + scaledFixtures + scaledWorking * 2
  const contingency = Math.round(subtotal * 0.1)

  return [
    {
      name: machineryName,
      qty: 1,
      unit_cost: scaledMachinery,
      total: scaledMachinery,
      category: "fixed",
    },
    {
      name: fixturesName,
      qty: 1,
      unit_cost: scaledFixtures,
      total: scaledFixtures,
      category: "fixed",
    },
    {
      name: workingCapitalName,
      qty: 2,
      unit_cost: scaledWorking,
      total: scaledWorking * 2,
      category: "working_capital",
    },
    {
      name:
        lang === "mr"
          ? "आकस्मिक व राखीव खर्च (10%)"
          : lang === "hi"
          ? "आकस्मिक निधि एवं रिजर्व (10%)"
          : "Contingency (10%)",
      qty: 1,
      unit_cost: contingency,
      total: contingency,
      category: "fixed",
    },
  ]
}

// Special Transport Scheme for Commercial Vehicles
const TRANSPORT_SCHEME: Record<string, Scheme> = {
  en: {
    id: "mudra_tarun_transport",
    name: "Mudra Tarun Commercial Vehicle Scheme",
    type: "Term Loan",
    agency: "Ministry of Finance / Public Sector Banks",
    eligible: "yes",
    reasons: [
      "Priority sector commercial vehicle term loan",
      "Covers up to 85-90% of on-road vehicle cost",
    ],
    benefits: "Term finance up to ₹10,00,000 without third-party collateral.",
    interest_range: "8.5% - 10.5% p.a.",
    collateral: "Hypothecation of vehicle only; no collateral property required",
    how_to_apply: [
      "Obtain proforma invoice from vehicle dealer and submit on Udyam Mitra portal or bank.",
    ],
    source_url: "https://www.mudra.org.in/",
    last_verified: "2026-10-11",
  },
  hi: {
    id: "mudra_tarun_transport",
    name: "मुद्रा तरुण कमर्शियल वाहन योजना",
    type: "मियादी ऋण",
    agency: "वित्त मंत्रालय / सार्वजनिक क्षेत्र के बैंक",
    eligible: "yes",
    reasons: [
      "प्राथमिकता प्राप्त क्षेत्र कमर्शियल वाहन ऋण",
      "वाहन की ऑन-रोड कीमत का 85-90% तक वित्तपोषण",
    ],
    benefits: "₹10,00,000 तक मियादी ऋण बिना किसी बाहरी संपत्ति गारंटी के।",
    interest_range: "8.5% - 10.5% प्रति वर्ष",
    collateral: "केवल वाहन का दृष्टिबंधक (हाइपोथीकेशन)",
    how_to_apply: ["वाहन कोटेशन के साथ उद्यम मित्र पोर्टल या नजदीकी बैंक में आवेदन करें।"],
    source_url: "https://www.mudra.org.in/",
    last_verified: "2026-10-11",
  },
  mr: {
    id: "mudra_tarun_transport",
    name: "मुद्रा तरुण व्यावसायिक वाहन कर्ज योजना",
    type: "मुदत कर्ज",
    agency: "वित्त मंत्रालय / राष्ट्रीयकृत बँका",
    eligible: "yes",
    reasons: [
      "प्राधान्य क्षेत्रातील व्यावसायिक वाहन वित्तपुरवठा",
      "वाहनाच्या ऑन-रोड किमतीच्या 85-90% पर्यंत कर्ज उपलब्ध",
    ],
    benefits: "₹10,00,000 पर्यंत थेट वाहन मुदत कर्ज.",
    interest_range: "8.5% - 10.5% प्रति वर्ष",
    collateral: "केवळ वाहनाचे हायपोथिकेशन; स्वतंत्र तारण मालमत्ता आवश्यक नाही",
    how_to_apply: ["वाहन विक्रेत्याच्या कोटेशनसह उद्यम मित्र पोर्टलवर किंवा बँकेत अर्ज करा."],
    source_url: "https://www.mudra.org.in/",
    last_verified: "2026-10-11",
  },
}

// Special PM-FME scheme for food processing & flour mills
const PM_FME_SCHEME: Record<string, Scheme> = {
  en: {
    id: "pm_fme",
    name: "PM Formalisation of Micro Food Processing Enterprises (PM-FME)",
    type: "Credit Linked Capital Subsidy",
    agency: "Ministry of Food Processing / State Nodal Agency",
    eligible: "yes",
    reasons: [
      "35% credit-linked capital subsidy on machinery and project cost",
      "Special priority for rural flour, spice & grain processing micro-units",
    ],
    benefits: "35% government capital subsidy (up to ₹10 Lakhs) with bank credit linkage.",
    interest_range: "8.5% - 10.5% p.a.",
    collateral: "No collateral required up to ₹10 Lakhs (CGTMSE coverage)",
    how_to_apply: [
      "Register on pmfme.mofpi.gov.in and submit DPR through District Resource Person (DRP).",
    ],
    source_url: "https://pmfme.mofpi.gov.in/",
    last_verified: "2026-10-11",
  },
  hi: {
    id: "pm_fme",
    name: "पीएम सूक्ष्म खाद्य प्रसंस्करण उद्यम औपचारिकीकरण (PM-FME)",
    type: "क्रेडिट लिंक्ड पूंजीगत सब्सिडी",
    agency: "खाद्य प्रसंस्करण उद्योग मंत्रालय / राज्य नोडल एजेंसी",
    eligible: "yes",
    reasons: [
      "मशीनरी व परियोजना लागत पर 35% पूंजीगत सब्सिडी",
      "आटा चक्की, मसाला पिसाई व स्थानीय प्रसंस्करण हेतु विशेष प्रावधान",
    ],
    benefits: "परियोजना लागत पर 35% क्रेडिट-लिंक्ड सब्सिडी (अधिकतम ₹10 लाख तक)।",
    interest_range: "8.5% - 10.5% प्रति वर्ष",
    collateral: "₹10 लाख तक कोई कोलैटरल नहीं (CGTMSE)",
    how_to_apply: ["pmfme.mofpi.gov.in पर ऑनलाइन आवेदन करें एवं डीपीआर सबमिट करें।"],
    source_url: "https://pmfme.mofpi.gov.in/",
    last_verified: "2026-10-11",
  },
  mr: {
    id: "pm_fme",
    name: "पंतप्रधान सूक्ष्म अन्न प्रक्रिया उद्योग योजना (PM-FME)",
    type: "क्रेडिट लिंक्ड भांडवली अनुदान",
    agency: "अन्न प्रक्रिया उद्योग मंत्रालय / कृषी विभाग महाराष्ट्र",
    eligible: "yes",
    reasons: [
      "यंत्रसामग्री व प्रकल्प खर्चावर 35% थेट सरकारी भांडवली अनुदान",
      "पीठ गिरणी, मसाला कांडप व धान्य प्रक्रियेसाठी विशेष प्राधान्य",
    ],
    benefits: "प्रकल्प खर्चावर 35% क्रेडिट-लिंक्ड सबसिडी (जास्तीत जास्त ₹10 लाखांपर्यंत).",
    interest_range: "8.5% - 10.5% प्रति वर्ष",
    collateral: "₹10 लाखांपर्यंत विनातारण (CGTMSE हमी)",
    how_to_apply: ["pmfme.mofpi.gov.in पोर्टलवर डीपीआरसह ऑनलाइन नोंदणी करा."],
    source_url: "https://pmfme.mofpi.gov.in/",
    last_verified: "2026-10-11",
  },
}

const MONTHLY_PROFIT_BY_BUSINESS: Record<string, number> = {
  commercial_transport: 45000,
  flour_spice_mill: 36000,
  kirana_store: 32000,
  tailoring: 22000,
  poultry_farming: 30000,
  goat_farming: 24000,
  mobile_repair: 25000,
  tiffin_food_stall: 22000,
  mushroom_farming: 26000,
  csc_eseva_center: 22000,
  dairy_small: 28000,
}

export const FinancePage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, idea, lang, report, setReport } = useAppStore()

  const currentContent = contentByLang[lang] || contentByLang.en
  const canonicalBusinessId = normalizeBusinessType(
    `${idea?.details || ""} ${idea?.business_type || ""}`
  )

  // Dynamically analyze the user's business description and scale
  const [items, setItems] = useState<InvestmentItem[]>(() =>
    analyzeDescriptionForInvestment(
      idea?.details || "",
      idea?.business_type || "",
      (idea?.scale as string) || "small",
      lang
    )
  )
  const [loading, setLoading] = useState(false)

  // Custom Item Addition Form State
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customUnitCost, setCustomUnitCost] = useState<number | "">("")
  const [customQty, setCustomQty] = useState<number>(1)
  const [customCategory, setCustomCategory] = useState<"fixed" | "working_capital">("fixed")

  // Fetch real backend investment calculations whenever business type or district changes
  useEffect(() => {
    let cancelled = false
    const fetchInvestment = async () => {
      setLoading(true)
      try {
        const queryBusinessId =
          canonicalBusinessId === "custom_enterprise"
            ? idea?.business_type || "enterprise"
            : canonicalBusinessId

        const res = await api.post("/finance/investment", {
          idea: {
            business_id: queryBusinessId,
            scale: (idea?.scale as any) || "small",
          },
          district: profile.district || "Nashik",
          quantity_overrides: [],
        })
        if (!cancelled && res.data?.items && res.data.items.length > 0) {
          const apiItems: InvestmentItem[] = res.data.items.map((it: any) => ({
            name: it.item,
            qty: it.quantity,
            unit_cost: Math.round(it.unit_cost),
            total: Math.round(it.line_total),
            category: it.category || "fixed",
          }))
          setItems(apiItems)
        } else if (!cancelled) {
          setItems(
            analyzeDescriptionForInvestment(
              idea?.details || "",
              idea?.business_type || "",
              (idea?.scale as string) || "small",
              lang
            )
          )
        }
      } catch (err) {
        console.warn("Investment API fallback to analyzed description", err)
        if (!cancelled) {
          setItems(
            analyzeDescriptionForInvestment(
              idea?.details || "",
              idea?.business_type || "",
              (idea?.scale as string) || "small",
              lang
            )
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchInvestment()
    return () => {
      cancelled = true
    }
  }, [canonicalBusinessId, idea?.details, idea?.business_type, idea?.scale, profile.district, lang])

  const totalInvestment = items.reduce((acc, curr) => acc + curr.total, 0)
  const userCapital = profile.capital || 50000
  const fundingGap = Math.max(0, totalInvestment - userCapital)

  // Interactive EMI slider parameters
  const [loanAmount, setLoanAmount] = useState(fundingGap)
  const [interestRate, setInterestRate] = useState(9.5)
  const [tenureMonths, setTenureMonths] = useState(36)

  // Sync loan amount to funding gap when items/gap changes initially
  useEffect(() => {
    setLoanAmount(fundingGap)
  }, [fundingGap])

  // Update report in store with latest user modifications
  useEffect(() => {
    if (report) {
      setReport({
        ...report,
        investment: {
          ...report.investment,
          total: totalInvestment,
          items: items.map(it => ({
            item: it.name || it.item || "",
            unit_cost: it.unit_cost,
            quantity: it.qty ?? it.quantity ?? 1,
            total: it.total,
          })),
        },
      })
    }
  }, [items, totalInvestment])

  // Safe EMI Calculation
  const effectiveLoan = Math.max(0, Number(loanAmount) || 0)
  const currentEmi = effectiveLoan > 0 ? calculateEmi(effectiveLoan, interestRate, tenureMonths) : 0
  const totalInterest =
    effectiveLoan > 0 ? calculateTotalInterest(effectiveLoan, interestRate, tenureMonths) : 0
  const totalRepayment = effectiveLoan + totalInterest

  const principalPct =
    totalRepayment > 0 ? Math.round((effectiveLoan / totalRepayment) * 100) : 100
  const interestPct = totalRepayment > 0 ? 100 - principalPct : 0

  const projectedMonthlyNetProfit =
    (report?.projection?.annual_net_profit
      ? Math.round(report.projection.annual_net_profit / 12)
      : null) ||
    MONTHLY_PROFIT_BY_BUSINESS[canonicalBusinessId] ||
    35000

  const dscrNumber = currentEmi > 0 ? projectedMonthlyNetProfit / currentEmi : 5.0
  const dscrFormatted = dscrNumber.toFixed(2)
  const isAffordable = dscrNumber >= 1.25

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty < 1) return
    const updated = [...items]
    updated[index].qty = newQty
    updated[index].total = newQty * updated[index].unit_cost
    setItems(updated)
    const newTot = updated.reduce((acc, curr) => acc + curr.total, 0)
    setLoanAmount(Math.max(0, newTot - userCapital))
  }

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) return
    const updated = items.filter((_, idx) => idx !== index)
    setItems(updated)
    const newTot = updated.reduce((acc, curr) => acc + curr.total, 0)
    setLoanAmount(Math.max(0, newTot - userCapital))
  }

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim() || !customUnitCost || Number(customUnitCost) <= 0) return

    const cost = Number(customUnitCost)
    const qty = Math.max(1, customQty)
    const newItem: InvestmentItem = {
      name: customName.trim(),
      qty,
      unit_cost: cost,
      total: cost * qty,
      category: customCategory,
      isCustom: true,
    }

    const updated = [...items, newItem]
    setItems(updated)
    const newTot = updated.reduce((acc, curr) => acc + curr.total, 0)
    setLoanAmount(Math.max(0, newTot - userCapital))

    // Reset Form
    setCustomName("")
    setCustomUnitCost("")
    setCustomQty(1)
    setShowAddCustom(false)
  }

  // Enterprise display title
  const rawTitle = idea?.business_type || canonicalBusinessId
  const businessTitle = rawTitle.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  // Dynamic schemes list tailored to enterprise
  const displayedSchemes: Scheme[] = (() => {
    const list = [...currentContent.schemes]
    if (canonicalBusinessId === "commercial_transport") {
      const transportScheme = TRANSPORT_SCHEME[lang] || TRANSPORT_SCHEME.en
      return [transportScheme, ...list.slice(0, 2)]
    }
    if (canonicalBusinessId === "flour_spice_mill" || canonicalBusinessId === "tiffin_food_stall") {
      const pmFme = PM_FME_SCHEME[lang] || PM_FME_SCHEME.en
      return [pmFme, ...list.slice(0, 2)]
    }
    return list
  })()

  // Dynamic subsidy & loan eligibility note
  const subsidyNote = (() => {
    if (canonicalBusinessId === "commercial_transport") {
      return lang === "mr"
        ? "मुद्रा तरुण किंवा स्टँड-अप इंडिया अंतर्गत विनातारण व्यावसायिक वाहन कर्जासाठी पात्र."
        : lang === "hi"
        ? "मुद्रा तरुण अथवा स्टैंड-अप इंडिया अंतर्गत संपार्श्विक-मुक्त कमर्शियल वाहन ऋण हेतु पात्र।"
        : "Eligible for collateral-free commercial vehicle credit up to ₹10-20 Lakhs under Mudra Tarun & Stand-Up India."
    }
    if (canonicalBusinessId === "flour_spice_mill" || canonicalBusinessId === "tiffin_food_stall") {
      return lang === "mr"
        ? "PM-FME योजनेतून 35% भांडवली अनुदान व मुद्रा/PMEGP कर्जासाठी पात्र."
        : lang === "hi"
        ? "PM-FME योजना अंतर्गत 35% सब्सिडी एवं मुद्रा/PMEGP ऋण हेतु पात्र।"
        : "Eligible for 35% subsidy under PM-FME and Mudra / PMEGP micro-credit."
    }
    return lang === "mr"
      ? "PMEGP (25-35% अनुदान) किंवा मुद्रा योजनेतून विनातारण कर्ज मिळण्यासाठी पात्र."
      : lang === "hi"
      ? "PMEGP (25-35% सब्सिडी) अथवा मुद्रा योजना अंतर्गत ऋण प्राप्त करने हेतु पात्र।"
      : "Eligible for 25-35% subsidy under PMEGP or collateral-free credit under Mudra Yojana."
  })()

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-md mb-2">
          <span>{businessTitle}</span>
        </div>
        <h2 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <Banknote className="w-6 h-6 text-primary-700" />
          <span>{t("finance.title")}</span>
        </h2>
        <p className="text-sm text-earth-600">
          {lang === "mr"
            ? "प्रकल्पाचा एकूण खर्च, अनुदाने आणि बँक कर्जाचा हप्ता (EMI) समजून घ्या."
            : lang === "hi"
            ? "परियोजना लागत, सरकारी सब्सिडी और ऋण की मासिक किस्त (EMI) देखें।"
            : "Tweak quantities or add custom equipment to recalculate capital requirement, funding gap, and matched government loans."}
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Analyzing business description and local equipment costs...</span>
        </div>
      )}

      {/* Section 1: Investment Table & Funding Gap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-earth-900">
              {t("finance.investment_table")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddCustom(!showAddCustom)}
              className="text-xs flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>
                {lang === "mr"
                  ? "+ स्वतःचे साहित्य / खर्च जोडा"
                  : lang === "hi"
                  ? "+ अपना कस्टम निवेश जोड़ें"
                  : "+ Add Custom Item"}
              </span>
            </Button>
          </div>

          {/* Inline Custom Investment Form */}
          {showAddCustom && (
            <Card className="border-primary/40 bg-primary/5 p-4 rounded-lg shadow-xs">
              <form onSubmit={handleAddCustomItem} className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-primary">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {lang === "mr"
                      ? "नवीन खर्च किंवा यंत्रसामग्री जोडा"
                      : lang === "hi"
                      ? "नया उपकरण या कस्टम खर्च जोड़ें"
                      : "Add Custom Equipment or Expense Item"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(false)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      {lang === "mr" ? "साहित्याचे / उपकरणाचे नाव" : lang === "hi" ? "उपकरण या सामग्री का नाम" : "Item Description"}
                    </label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={
                        lang === "mr"
                          ? "उदा. कमर्शियल डीप फ्रीझर, सौर इन्व्हर्टर, डिलिव्हरी बाईक..."
                          : lang === "hi"
                          ? "उदा. कमर्शियल डीप फ्रीजर, सोलर इन्वर्टर, डिलीवरी बाइक..."
                          : "e.g., Commercial Refrigerator, Solar Backup, Delivery Bike..."
                      }
                      className="w-full text-xs bg-card border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      {lang === "mr" ? "प्रति नग किंमत (₹)" : lang === "hi" ? "प्रति इकाई लागत (₹)" : "Unit Cost (₹)"}
                    </label>
                    <input
                      type="number"
                      required
                      min="100"
                      step="500"
                      value={customUnitCost}
                      onChange={(e) => setCustomUnitCost(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="₹ 25,000"
                      className="w-full text-xs bg-card border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      {lang === "mr" ? "नग / संख्या (Qty)" : lang === "hi" ? "मात्रा (Qty)" : "Quantity"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={customQty}
                      onChange={(e) => setCustomQty(Math.max(1, Number(e.target.value)))}
                      className="w-full text-xs bg-card border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      {lang === "mr" ? "खर्चाचा प्रकार" : lang === "hi" ? "व्यय श्रेणी" : "Category"}
                    </label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as any)}
                      className="w-full text-xs bg-card border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="fixed">
                        {lang === "mr" ? "स्थिर भांडवल (यंत्रसामग्री/साधन)" : lang === "hi" ? "अचल पूंजी (मशीनरी/उपकरण)" : "Fixed Asset / Equipment"}
                      </option>
                      <option value="working_capital">
                        {lang === "mr" ? "खेळते भांडवल (कच्चा माल/साठा)" : lang === "hi" ? "कार्यशील पूंजी (कच्चा माल/स्टॉक)" : "Working Capital / Raw Stock"}
                      </option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="w-full text-xs font-semibold">
                      {lang === "mr" ? "खर्च जोडा" : lang === "hi" ? "जोड़ें" : "Add to Investment"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddCustom(false)}
                      className="text-xs"
                    >
                      {lang === "mr" ? "रद्द" : lang === "hi" ? "रद्द" : "Cancel"}
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          )}

          {/* Investment Table */}
          <div className="overflow-x-auto border border-border rounded-lg bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-foreground font-semibold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="p-3">{t("finance.item")}</th>
                  <th className="p-3 text-center">{t("finance.qty")}</th>
                  <th className="p-3 text-right">{t("finance.unit_cost")}</th>
                  <th className="p-3 text-right">{t("finance.total")}</th>
                  <th className="p-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{item.name || item.item}</span>
                        {item.isCustom && (
                          <span className="text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.2 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5 border border-border rounded px-1.5 py-0.5 bg-secondary/50">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, (item.qty ?? item.quantity ?? 1) - 1)}
                          className="text-muted-foreground hover:text-foreground px-1 font-bold cursor-pointer"
                          title="Decrease"
                        >
                          -
                        </button>
                        <span className="font-semibold text-foreground">
                          {item.qty ?? item.quantity ?? 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, (item.qty ?? item.quantity ?? 1) + 1)}
                          className="text-muted-foreground hover:text-foreground px-1 font-bold cursor-pointer"
                          title="Increase"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {formatCurrency(item.unit_cost)}
                    </td>
                    <td className="p-3 text-right font-bold text-foreground">
                      {formatCurrency(item.total)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="text-muted-foreground hover:text-rose-600 p-1 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40 border-t border-border font-bold">
                <tr>
                  <td colSpan={3} className="p-3 text-foreground text-right">
                    {t("finance.total_investment")}:
                  </td>
                  <td className="p-3 text-right text-primary text-sm font-extrabold">
                    {formatCurrency(totalInvestment)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Capital Adequacy & Funding Gap */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-earth-900">
            {t("finance.capital_adequacy")}
          </h3>

          <Card className="border-border">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-earth-600">
                  <span>{t("finance.your_capital")}</span>
                  <span className="font-bold text-earth-900">{formatCurrency(userCapital)}</span>
                </div>
                <div className="flex justify-between text-xs text-earth-600">
                  <span>{t("finance.total_investment")}</span>
                  <span className="font-bold text-earth-900">{formatCurrency(totalInvestment)}</span>
                </div>
              </div>

              {/* Progress bar visual */}
              <div className="space-y-1">
                <div className="w-full bg-earth-200 h-3 rounded overflow-hidden flex">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (userCapital / Math.max(1, totalInvestment)) * 100
                      )}%`,
                    }}
                    title="User Capital"
                  />
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{
                      width: `${Math.max(
                        0,
                        100 - (userCapital / Math.max(1, totalInvestment)) * 100
                      )}%`,
                    }}
                    title="Funding Gap"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-earth-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-primary" /> {t("finance.your_capital")} (
                    {Math.round((userCapital / Math.max(1, totalInvestment)) * 100)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-amber-500" /> {t("finance.funding_gap")}
                  </span>
                </div>
              </div>

              {/* Gap Value banner */}
              <div className="p-3 rounded-md bg-amber-500/15 border border-amber-500/30 space-y-1">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold block">
                  {t("finance.funding_gap")}
                </span>
                <div className="text-2xl font-extrabold text-amber-800 dark:text-amber-300">
                  {formatCurrency(fundingGap)}
                </div>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90">
                  {subsidyNote}
                </p>
              </div>

              {/* Quick action to push gap into EMI calculator */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLoanAmount(fundingGap)}
                className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {lang === "mr"
                    ? `कर्ज रक्कम निधी तुटीशी जुळवा (${formatCurrency(fundingGap)})`
                    : lang === "hi"
                    ? `ऋण राशि अंतर से मिलाएँ (${formatCurrency(fundingGap)})`
                    : `Set EMI Loan to Gap (${formatCurrency(fundingGap)})`}
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Government Schemes For You */}
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-base text-earth-900">
            {t("finance.schemes_title")}
          </h3>
          <p className="text-xs text-earth-600">
            Filtered from official Central & Maharashtra MSME guidelines for {businessTitle}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayedSchemes.map((scheme, idx) => (
            <SchemeCard key={scheme.id || idx} scheme={scheme} />
          ))}
        </div>
      </div>

      {/* Section 3: Interactive Loan EMI Calculator */}
      <Card className="border-border">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base text-foreground">
                {t("finance.emi_calculator")}
              </h3>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded">
              Interactive Bank Loan Simulation
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sliders & Direct Inputs (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Loan Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <label htmlFor="emi-loan-input">{t("finance.loan_amount")}</label>
                  <div className="flex items-center gap-1 bg-secondary border border-border rounded px-2 py-0.5">
                    <span className="text-xs text-muted-foreground font-bold">₹</span>
                    <input
                      id="emi-loan-input"
                      type="number"
                      min={0}
                      step={5000}
                      value={effectiveLoan}
                      onChange={(e) => setLoanAmount(Math.max(0, Number(e.target.value)))}
                      className="w-24 text-right text-xs font-bold text-primary bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={Math.max(1000000, Math.round(totalInvestment * 1.5))}
                  step={1000}
                  value={effectiveLoan}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer h-2"
                />

                {/* Quick Loan Amount Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setLoanAmount(fundingGap)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 cursor-pointer"
                  >
                    Match Gap: {formatCurrency(fundingGap)}
                  </button>
                  {[100000, 250000, 500000, 1000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLoanAmount(preset)}
                      className="text-[11px] px-2 py-0.5 rounded bg-secondary/60 text-muted-foreground border border-border hover:bg-secondary cursor-pointer"
                    >
                      {formatCurrency(preset)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Interest Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <label htmlFor="emi-interest-input">{t("finance.interest_rate")}</label>
                  <div className="flex items-center gap-1 bg-secondary border border-border rounded px-2 py-0.5">
                    <input
                      id="emi-interest-input"
                      type="number"
                      min={5}
                      max={20}
                      step={0.1}
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-14 text-right text-xs font-bold text-primary bg-transparent focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground font-bold">% p.a.</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={5.0}
                  max={18.0}
                  step={0.1}
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer h-2"
                />

                {/* Quick Interest Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: "8.5% (Mudra Priority)", val: 8.5 },
                    { label: "9.5% (Bank Standard)", val: 9.5 },
                    { label: "11.0% (Commercial / NBFC)", val: 11.0 },
                    { label: "12.5% (MFI)", val: 12.5 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setInterestRate(preset.val)}
                      className={`text-[11px] px-2 py-0.5 rounded border cursor-pointer ${
                        interestRate === preset.val
                          ? "bg-primary text-white border-primary font-bold"
                          : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Tenure */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <label htmlFor="emi-tenure-input">{t("finance.tenure")}</label>
                  <div className="flex items-center gap-1 bg-secondary border border-border rounded px-2 py-0.5">
                    <input
                      id="emi-tenure-input"
                      type="number"
                      min={6}
                      max={84}
                      step={6}
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(Math.max(6, Number(e.target.value)))}
                      className="w-12 text-right text-xs font-bold text-primary bg-transparent focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground font-bold">
                      {lang === "mr" ? "महिने" : lang === "hi" ? "माह" : "mo"} ({(tenureMonths / 12).toFixed(1)} yr)
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={6}
                  max={84}
                  step={6}
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer h-2"
                />

                {/* Quick Tenure Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: "12m (1 Yr)", val: 12 },
                    { label: "24m (2 Yrs)", val: 24 },
                    { label: "36m (3 Yrs)", val: 36 },
                    { label: "48m (4 Yrs)", val: 48 },
                    { label: "60m (5 Yrs)", val: 60 },
                    { label: "84m (7 Yrs)", val: 84 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setTenureMonths(preset.val)}
                      className={`text-[11px] px-2 py-0.5 rounded border cursor-pointer ${
                        tenureMonths === preset.val
                          ? "bg-primary text-white border-primary font-bold"
                          : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live EMI Calculation Result Card (5 Cols) */}
            <div className="lg:col-span-5 bg-secondary/40 p-5 rounded-lg border border-border space-y-5">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  {t("finance.monthly_emi")}
                </span>
                <div className="text-3xl font-extrabold text-primary">
                  {formatCurrency(currentEmi)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {lang === "mr" ? "दरमहा हप्ता" : lang === "hi" ? "प्रति माह" : "/ month"}
                  </span>
                </div>
              </div>

              {/* Principal vs Interest Breakdown Bar */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>Repayment Composition</span>
                  <span>{formatCurrency(totalRepayment)} Total</span>
                </div>

                <div className="w-full h-3 bg-muted rounded overflow-hidden flex">
                  <div
                    className="bg-emerald-600 dark:bg-emerald-500 h-full transition-all"
                    style={{ width: `${principalPct}%` }}
                    title={`Principal: ${principalPct}%`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{ width: `${interestPct}%` }}
                    title={`Interest: ${interestPct}%`}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Principal: {formatCurrency(effectiveLoan)} ({principalPct}%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Interest: {formatCurrency(totalInterest)} ({interestPct}%)</span>
                  </span>
                </div>
              </div>

              {/* Affordability check indicator */}
              <div
                className={`p-3 rounded text-xs flex items-start gap-2.5 border ${
                  effectiveLoan === 0
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                    : isAffordable
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                }`}
              >
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-current" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-[13px]">
                    {effectiveLoan === 0
                      ? "100% Self-Funded (No Loan Needed)"
                      : isAffordable
                      ? t("finance.affordable")
                      : t("finance.not_affordable")}
                  </span>
                  <p className="text-[11px] leading-relaxed text-current/90">
                    {effectiveLoan === 0
                      ? "Your available capital covers 100% of the project cost. No loan repayment required."
                      : lang === "mr"
                      ? `अंदाजित निव्वळ नफा: ${formatCurrency(
                          projectedMonthlyNetProfit
                        )}/महिना. DSCR: ${dscrFormatted} (${isAffordable ? "उत्तम परतफेड क्षमता" : "कमी नफा मार्जिन"}).`
                      : lang === "hi"
                      ? `अनुमानित शुद्ध लाभ: ${formatCurrency(
                          projectedMonthlyNetProfit
                        )}/माह। DSCR: ${dscrFormatted} (${isAffordable ? "उत्कृष्ट भुगतान क्षमता" : "कम मार्जिन"}).`
                      : `Est. monthly net profit: ${formatCurrency(
                          projectedMonthlyNetProfit
                        )}. Debt Service Coverage Ratio (DSCR): ${dscrFormatted} (${
                          dscrNumber >= 1.5 ? "Strong" : isAffordable ? "Adequate" : "Tight"
                        }).`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nav Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => navigate("/analysis")}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.back")}</span>
        </Button>

        <Button
          onClick={() => navigate("/credit")}
          className="flex items-center gap-1.5 font-semibold"
        >
          <span>{t("credit.title")}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
