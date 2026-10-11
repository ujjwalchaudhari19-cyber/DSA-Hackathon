import React, { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import {
  FileCheck,
  CheckSquare,
  Square,
  Clock,
  DollarSign,
  ArrowRight,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

export interface DocItem {
  id: string
  name: string
  category: "legal" | "financial"
  why: string
  where_to_get: string
  time: string
  cost: string
  checked: boolean
}

type LoanScheme = "mudra_shishu" | "mudra_kishore" | "mudra_tarun" | "pmegp" | "kcc"
type SocialCategory = "general" | "obc" | "sc_st" | "woman"
type SectorType = "dairy" | "processing" | "manufacturing" | "services" | "custom"

export const DocumentsPage: React.FC = () => {
  const { t } = useTranslation()
  const { lang, profile, idea } = useAppStore()

  // Form criteria state (prefilled from profile / business idea if present)
  const [loanScheme, setLoanScheme] = useState<LoanScheme>("mudra_kishore")
  const [loanAmount, setLoanAmount] = useState<number>(profile.capital > 0 ? 286000 - profile.capital : 236000)
  const [monthlyIncome, setMonthlyIncome] = useState<number>(25000)
  const [applicantCategory, setApplicantCategory] = useState<SocialCategory>(
    (profile.category === "sc" || profile.category === "st") ? "sc_st" : profile.category === "obc" ? "obc" : profile.gender === "f" ? "woman" : "general"
  )
  const defaultSector: SectorType = useMemo(() => {
    const bt = (idea?.business_type || "").toLowerCase()
    if (bt.includes("flour") || bt.includes("spice") || bt.includes("mill") || bt.includes("food") || bt.includes("tiffin") || bt.includes("mushroom")) {
      return "processing"
    }
    if (bt.includes("manufacturing") || bt.includes("fabrication")) {
      return "manufacturing"
    }
    if (bt.includes("repair") || bt.includes("tailor") || bt.includes("csc") || bt.includes("kirana") || bt.includes("store") || bt.includes("services")) {
      return "services"
    }
    if (bt.includes("dairy") || bt.includes("cow") || bt.includes("cattle") || bt.includes("goat") || bt.includes("poultry")) {
      return "dairy"
    }
    return "processing"
  }, [idea?.business_type])

  const [sector, setSector] = useState<SectorType>(defaultSector)
  const [customSectorName, setCustomSectorName] = useState<string>("")

  // Has generated checklist
  const [isGenerated, setIsGenerated] = useState<boolean>(true)
  const [showForm, setShowForm] = useState<boolean>(false)

  // Active category filter tab: "all" | "legal" | "financial"
  const [activeTab, setActiveTab] = useState<"all" | "legal" | "financial">("all")

  // Checked state map: docId -> boolean
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({
    aadhaar_pan: true,
    udyam: true,
    dairy_card: defaultSector === "dairy",
  })

  // Multilingual labels for form & UI
  const uiText = useMemo(() => {
    return {
      en: {
        title: "Loan Document Requirement Checklist",
        subtitle: "Customize your loan requirements and monthly income to generate an exact bank checklist.",
        formTitle: "Loan & Financial Profile",
        formDesc: "Select your expected loan scheme, amount, and monthly income to determine required documentation.",
        loanTypeLabel: "Loan Scheme You Are Applying For",
        loanAmountLabel: "Loan Amount Needed (₹)",
        incomeLabel: "Your Estimated Monthly Income (₹)",
        categoryLabel: "Applicant Social Category (for subsidies)",
        sectorLabel: "Enterprise Activity / Sector",
        generateBtn: "Generate Required Document Checklist",
        updateBtn: "Update Document Checklist",
        editParams: "Change Requirements",
        hideParams: "Hide Options",
        customChecklistFor: "Tailored Checklist Generated For:",
        readinessTitle: "Readiness Progress",
        tabAll: "All Required Documents",
        tabLegal: "Identity & Registrations",
        tabFinancial: "Financials & Quotations",
        whereToGet: "Where to obtain:",
        markAll: "Mark All Done",
        resetAll: "Reset Checks",
        schemes: {
          mudra_shishu: "Mudra Shishu (Up to ₹50,000)",
          mudra_kishore: "Mudra Kishore (₹50,000 – ₹5 Lakhs)",
          mudra_tarun: "Mudra Tarun (₹5 Lakhs – ₹10 Lakhs)",
          pmegp: "PMEGP (Up to ₹25L–₹50L with 15-35% Subsidy)",
          kcc: "KCC Pashupalan / Dairy Working Capital",
        },
        categories: {
          general: "General Category",
          obc: "OBC Category",
          sc_st: "SC / ST Category",
          woman: "Women Entrepreneur",
        },
        sectors: {
          dairy: "Dairy & Livestock Farming",
          processing: "Food, Spice & Oil Processing",
          manufacturing: "Micro Manufacturing / Workshop",
          services: "Rural Retail & Village Services",
          custom: "Other / Custom Idea",
        },
      },
      hi: {
        title: "ऋण दस्तावेज़ आवश्यकता चेकलिस्ट",
        subtitle: "अपनी ऋण आवश्यकता, आय और योजना के अनुसार बैंक द्वारा मांगे जाने वाले दस्तावेज़ों की सूची तैयार करें।",
        formTitle: "ऋण एवं वित्तीय विवरण",
        formDesc: "अपनी ऋण योजना, आवश्यक राशि और मासिक आय दर्ज करें ताकि सटीक चेकलिस्ट तैयार हो सके।",
        loanTypeLabel: "आप किस ऋण योजना हेतु आवेदन कर रहे हैं?",
        loanAmountLabel: "आवश्यक ऋण राशि (₹)",
        incomeLabel: "आपकी मासिक आय (₹)",
        categoryLabel: "आवेदक सामाजिक वर्ग (सब्सिडी हेतु)",
        sectorLabel: "व्यवसाय का प्रकार / क्षेत्र",
        generateBtn: "आवश्यक दस्तावेज़ चेकलिस्ट तैयार करें",
        updateBtn: "दस्तावेज़ सूची अपडेट करें",
        editParams: "विवरण बदलें",
        hideParams: "विवरण छुपाएं",
        customChecklistFor: "इन मापदंडों के अनुसार तैयार चेकलिस्ट:",
        readinessTitle: "तैयारी प्रगति",
        tabAll: "सभी आवश्यक दस्तावेज़",
        tabLegal: "पहचान व पंजीकरण",
        tabFinancial: "वित्तीय व कोटेशन",
        whereToGet: "कहाँ से प्राप्त करें:",
        markAll: "सभी टिक करें",
        resetAll: "पुनः सेट करें",
        schemes: {
          mudra_shishu: "मुद्रा शिशु (₹50,000 तक)",
          mudra_kishore: "मुद्रा किशोर (₹50,000 से ₹5 लाख)",
          mudra_tarun: "मुद्रा तरुण (₹5 लाख से ₹10 लाख)",
          pmegp: "PMEGP योजना (15-35% सरकारी सब्सिडी सहित)",
          kcc: "केसीसी पशुपालन / दुग्धव्यवसाय कार्यशील पूंजी",
        },
        categories: {
          general: "सामान्य वर्ग (General)",
          obc: "अन्य पिछड़ा वर्ग (OBC)",
          sc_st: "अनुसूचित जाति / जनजाति (SC/ST)",
          woman: "महिला उद्यमी",
        },
        sectors: {
          dairy: "डेयरी एवं पशुपालन व्यवसाय",
          processing: "आटा, मसाला एवं खाद्य तेल प्रसंस्करण",
          manufacturing: "लघु विनिर्माण एवं कार्यशाला",
          services: "ग्रामीण दुकान एवं सेवाएं",
          custom: "अन्य / कस्टम विचार",
        },
      },
      mr: {
        title: "कर्ज कागदपत्रे तपासणी व पूर्वतयारी चेकलिस्ट",
        subtitle: "कर्जाचा प्रकार, आवश्यक रक्कम आणि मासिक उत्पन्न निवडून बँकेला लागणाऱ्या कागदपत्रांची अचूक यादी मिळवा.",
        formTitle: "कर्ज व आर्थिक तपशील",
        formDesc: "अचूक कागदपत्रांची यादी तयार करण्यासाठी तुमची योजना, कर्जाची रक्कम आणि मासिक उत्पन्न निवडा.",
        loanTypeLabel: "तुम्ही कोणत्या कर्ज योजनेसाठी अर्ज करत आहात?",
        loanAmountLabel: "आवश्यक कर्ज रक्कम (₹)",
        incomeLabel: "तुमचे अंदाजित मासिक उत्पन्न (₹)",
        categoryLabel: "अर्जदाराचा सामाजिक प्रवर्ग (अनुदानासाठी)",
        sectorLabel: "व्यवसायाचा प्रकार / क्षेत्र",
        generateBtn: "कागदपत्रांची आवश्यक यादी तयार करा",
        updateBtn: "कागदपत्र यादी अद्ययावत करा",
        editParams: "माहिती बदला",
        hideParams: "माहिती लपवा",
        customChecklistFor: "या निकषांनुसार तयार केलेली चेकलिस्ट:",
        readinessTitle: "तयारी प्रगती",
        tabAll: "सर्व आवश्यक कागदपत्रे",
        tabLegal: "ओळख व शासकीय नोंदणी",
        tabFinancial: "आर्थिक व कोटेशन",
        whereToGet: "कुठून मिळवावे:",
        markAll: "सर्व पूर्ण म्हणून नोंदवा",
        resetAll: "पुन्हा सेट करा",
        schemes: {
          mudra_shishu: "मुद्रा शिशु कर्ज (₹50,000 पर्यंत)",
          mudra_kishore: "मुद्रा किशोर कर्ज (₹50,000 ते ₹5 लाख)",
          mudra_tarun: "मुद्रा तरुण कर्ज (₹5 लाख ते ₹10 लाख)",
          pmegp: "PMEGP योजना (15-35% सबसिडीसह)",
          kcc: "केसीसी पशुपालन / डेअरी खेळते भांडवल",
        },
        categories: {
          general: "खुला प्रवर्ग (General)",
          obc: "इतर मागासवर्गीय (OBC)",
          sc_st: "अनुसूचित जाती / जमाती (SC/ST)",
          woman: "महिला उद्योजक",
        },
        sectors: {
          dairy: "दुग्धव्यवसाय व गोठा पालन",
          processing: "धान्य, मसाला व खाद्यतेल प्रक्रिया",
          manufacturing: "लघु उत्पादन व फॅब्रिकेशन",
          services: "ग्रामीण किरकोळ विक्री व सेवा",
          custom: "इतर / तुमची कल्पना",
        },
      },
    }[lang] || {
      title: "Loan Document Requirement Checklist",
      subtitle: "Customize your loan requirements and monthly income to generate an exact bank checklist.",
      formTitle: "Loan & Financial Profile",
      formDesc: "Select your expected loan scheme, amount, and monthly income to determine required documentation.",
      loanTypeLabel: "Loan Scheme You Are Applying For",
      loanAmountLabel: "Loan Amount Needed (₹)",
      incomeLabel: "Your Estimated Monthly Income (₹)",
      categoryLabel: "Applicant Social Category (for subsidies)",
      sectorLabel: "Enterprise Activity / Sector",
      generateBtn: "Generate Required Document Checklist",
      updateBtn: "Update Document Checklist",
      editParams: "Change Requirements",
      hideParams: "Hide Options",
      customChecklistFor: "Tailored Checklist Generated For:",
      readinessTitle: "Readiness Progress",
      tabAll: "All Required Documents",
      tabLegal: "Identity & Registrations",
      tabFinancial: "Financials & Quotations",
      whereToGet: "Where to obtain:",
      markAll: "Mark All Done",
      resetAll: "Reset Checks",
      schemes: {
        mudra_shishu: "Mudra Shishu (Up to ₹50,000)",
        mudra_kishore: "Mudra Kishore (₹50,000 – ₹5 Lakhs)",
        mudra_tarun: "Mudra Tarun (₹5 Lakhs – ₹10 Lakhs)",
        pmegp: "PMEGP (Up to ₹25L–₹50L with 15-35% Subsidy)",
        kcc: "KCC Pashupalan / Dairy Working Capital",
      },
      categories: {
        general: "General Category",
        obc: "OBC Category",
        sc_st: "SC / ST Category",
        woman: "Women Entrepreneur",
      },
      sectors: {
        dairy: "Dairy & Livestock Farming",
        processing: "Food, Spice & Oil Processing",
        manufacturing: "Micro Manufacturing / Workshop",
        services: "Rural Retail & Village Services",
        custom: "Other / Custom Idea",
      },
    }
  }, [lang])

  // Master Document Definitions translated across EN, HI, MR
  const masterDocs = useMemo<Record<string, Record<string, Omit<DocItem, "checked">>>>(() => {
    return {
      en: {
        aadhaar_pan: {
          id: "aadhaar_pan",
          name: "Aadhaar Card & PAN Card Copies",
          category: "legal",
          why: "Mandatory primary KYC verification for Mudra / PMEGP beneficiary account opening and credit bureau checks.",
          where_to_get: "UIDAI Portal / NSDL PAN Kiosk",
          time: "Immediate",
          cost: "Nil",
        },
        photo_kyc: {
          id: "photo_kyc",
          name: "Passport Size Photographs (3 Copies) & Voter ID / Ration Card",
          category: "legal",
          why: "Required for physical loan application dossier and rural residential proof.",
          where_to_get: "Local Studio / Gram Panchayat Ration Record",
          time: "1 Day",
          cost: "₹50",
        },
        bank_passbook: {
          id: "bank_passbook",
          name: "Bank Statement / Passbook (Last 6 Months)",
          category: "financial",
          why: "Assesses cash flow stability, verifies monthly income deposits, and confirms active balance.",
          where_to_get: "Bank Branch / Passbook printing kiosk",
          time: "1 Day",
          cost: "Nil",
        },
        udyam: {
          id: "udyam",
          name: "Udyam MSME Registration Certificate",
          category: "legal",
          why: "Mandatory for government subsidies, priority sector lending interest subvention, and CGTMSE guarantee.",
          where_to_get: "Udyamregistration.gov.in (Online portal with Aadhaar - Free)",
          time: "1 - 2 Days",
          cost: "Free (Nil Fee)",
        },
        panchayat: {
          id: "panchayat",
          name: "Gram Panchayat No-Objection Certificate (NOC) / Trade Permit",
          category: "legal",
          why: "Permits commercial operations, sheds, or processing machinery on village revenue land.",
          where_to_get: "Gram Sevak / Village Panchayat Office",
          time: "3 - 5 Days",
          cost: "₹100 - ₹300",
        },
        quotation: {
          id: "quotation",
          name: "Equipment / Machinery / Cattle Pro-forma Invoice & Quotation",
          category: "financial",
          why: "Mandatory for direct bank disbursement to authorized seller or dealer. Loan is not given as raw cash.",
          where_to_get: "Authorized cattle breeder or machinery dealer GST invoice",
          time: "1 - 2 Days",
          cost: "Nil",
        },
        dpr_project: {
          id: "dpr_project",
          name: "Detailed Project Report (DPR) & 3-Year Cash Flow Projections",
          category: "financial",
          why: "Required by bank branch manager to verify Debt Service Coverage Ratio (DSCR > 1.25) and break-even feasibility.",
          where_to_get: "Generated from GramUdyam AI Report or local CA / DIC office",
          time: "1 Day",
          cost: "Free via GramUdyam AI",
        },
        dairy_card: {
          id: "dairy_card",
          name: "Cooperative Milk Producer Membership Card & Supply Ledger",
          category: "legal",
          why: "Validates direct daily off-take agreements with Sahyadri/Mahanand cooperative and stable payout cycle.",
          where_to_get: "Local Village Dairy Cooperative Society (DCS)",
          time: "2 Days",
          cost: "₹50 - ₹100",
        },
        fssai: {
          id: "fssai",
          name: "FSSAI Basic Food Registration Certificate",
          category: "legal",
          why: "Required by health norms if processing milk into curd/ghee or packaging spices and flour.",
          where_to_get: "FoSCoS Online Portal (foscos.fssai.gov.in)",
          time: "7 Days",
          cost: "₹100 / year",
        },
        category_cert: {
          id: "category_cert",
          name: "Caste / Category Certificate (OBC / SC / ST / Special Category)",
          category: "legal",
          why: "Verifies eligibility for 25% to 35% capital subsidy margin under PMEGP or Stand-Up India.",
          where_to_get: "Tahsil Office / Aaple Sarkar Portal / CSC Center",
          time: "15 Days",
          cost: "₹50",
        },
        itr_tax: {
          id: "itr_tax",
          name: "Income Tax Returns (ITR-4 / Form 16) or Sales Ledger (Last 1-2 Years)",
          category: "financial",
          why: "Required for loans above ₹5 Lakhs (Mudra Tarun) or when monthly income exceeds ₹35,000.",
          where_to_get: "Income Tax E-filing portal / Local Tax Consultant",
          time: "2 - 3 Days",
          cost: "₹500 - ₹1,000",
        },
        income_cert: {
          id: "income_cert",
          name: "Tahsildar Income Certificate / Gram Sevak Self-Declaration",
          category: "financial",
          why: "Proves low-income status for priority micro loans (Mudra Shishu) without audited accounts.",
          where_to_get: "Talathi / Tahsildar Office / Aaple Sarkar",
          time: "5 - 7 Days",
          cost: "₹35",
        },
        edp_cert: {
          id: "edp_cert",
          name: "EDP (Entrepreneurship Development Programme) Training Certificate",
          category: "legal",
          why: "Mandatory for PMEGP loan subsidy sanction to certify business management readiness.",
          where_to_get: "RSETI / KVIC / Online Udyamimitra portal",
          time: "5 - 10 Days",
          cost: "Free (Govt sponsored)",
        },
        land_extract: {
          id: "land_extract",
          name: "Premises Ownership (7/12 Extract / Satbara) or Registered Rent Agreement",
          category: "legal",
          why: "Verifies legal possession of the work premises or farm land for business installation.",
          where_to_get: "Mahabhumi Portal / Sub-Registrar Office",
          time: "1 - 3 Days",
          cost: "₹20 - ₹200",
        },
      },
      hi: {
        aadhaar_pan: {
          id: "aadhaar_pan",
          name: "आधार कार्ड एवं पैन कार्ड प्रतियां",
          category: "legal",
          why: "मुद्रा / PMEGP ऋण खाता खोलने एवं सिबिल स्कोर जांच हेतु प्राथमिक अनिवार्य केवाईसी दस्तावेज़।",
          where_to_get: "यूआईडीएआई पोर्टल / एनएसडीएल केंद्र",
          time: "तत्काल",
          cost: "निःशुल्क",
        },
        photo_kyc: {
          id: "photo_kyc",
          name: "पासपोर्ट साइज फोटो (3 प्रतियां) एवं वोटर कार्ड / राशन कार्ड",
          category: "legal",
          why: "बैंक ऋण फ़ाइल एवं ग्रामीण पते के सत्यापन हेतु आवश्यक।",
          where_to_get: "स्थानीय फोटो स्टूडियो / ग्राम पंचायत",
          time: "1 दिन",
          cost: "₹50",
        },
        bank_passbook: {
          id: "bank_passbook",
          name: "बैंक पासबुक / खाता विवरण (अंतिम 6 माह)",
          category: "financial",
          why: "नकदी प्रवाह स्थिरता, मासिक आय जमा और नियमित बैंकिंग लेन-देन की पुष्टि हेतु।",
          where_to_get: "बैंक शाखा / पासबुक प्रिंटर केंद्र",
          time: "1 दिन",
          cost: "निःशुल्क",
        },
        udyam: {
          id: "udyam",
          name: "उद्यम एमएसएमई पंजीकरण प्रमाणपत्र",
          category: "legal",
          why: "सरकारी सब्सिडी, रियायती ब्याज दर और मुद्रा ऋण गारंटी हेतु अनिवार्य।",
          where_to_get: "Udyamregistration.gov.in (आधार द्वारा निःशुल्क ऑनलाइन पोर्टल)",
          time: "1 - 2 दिन",
          cost: "निःशुल्क",
        },
        panchayat: {
          id: "panchayat",
          name: "ग्राम पंचायत अनापत्ति प्रमाणपत्र (NOC) / व्यवसाय अनुमति",
          category: "legal",
          why: "स्थानीय भूमि पर व्यावसायिक गोठा, शेड अथवा मशीनरी स्थापना की अनुमति।",
          where_to_get: "ग्राम सेवक / ग्राम पंचायत कार्यालय",
          time: "3 - 5 दिन",
          cost: "₹100 - ₹300",
        },
        quotation: {
          id: "quotation",
          name: "पशुधन / मशीनरी कोटेशन एवं प्रोफॉर्मा चालान",
          category: "financial",
          why: "बैंक द्वारा ऋण राशि का सीधा भुगतान विक्रेता को करने हेतु अनिवार्य।",
          where_to_get: "अधिकृत पशुपालक अथवा उपकरण विक्रेता का जीएसटी बिल",
          time: "1 - 2 दिन",
          cost: "निःशुल्क",
        },
        dpr_project: {
          id: "dpr_project",
          name: "विस्तृत परियोजना रिपोर्ट (DPR) एवं 3-वर्षीय नकद प्रवाह अनुमान",
          category: "financial",
          why: "बैंक प्रबंधक द्वारा परियोजना की व्यवहार्यता एवं ऋण चुकाने की क्षमता (DSCR > 1.25) जांचने हेतु।",
          where_to_get: "ग्रामउद्यम AI रिपोर्ट अथवा स्थानीय सीए कार्यालय",
          time: "1 दिन",
          cost: "ग्रामउद्यम AI पर निःशुल्क",
        },
        dairy_card: {
          id: "dairy_card",
          name: "सहकारी दुग्ध उत्पादक सभासद पत्र / पासबुक",
          category: "legal",
          why: "दूध की दैनिक बिक्री और नियमित आय भुगतान का आधिकारिक प्रमाण।",
          where_to_get: "स्थानीय सहकारी दुग्ध संघ कार्यालय",
          time: "2 दिन",
          cost: "₹50 - ₹100",
        },
        fssai: {
          id: "fssai",
          name: "FSSAI खाद्य सुरक्षा बेसिक पंजीकरण",
          category: "legal",
          why: "दूध, दही, घी, आटा अथवा मसाले की ब्रांडेड पैकेजिंग करने हेतु अनिवार्य।",
          where_to_get: "FoSCoS ऑनलाइन पोर्टल (foscos.fssai.gov.in)",
          time: "7 दिन",
          cost: "₹100 / वर्ष",
        },
        category_cert: {
          id: "category_cert",
          name: "जाति प्रमाणपत्र (OBC / SC / ST विशेष वर्ग)",
          category: "legal",
          why: "PMEGP अथवा स्टैंड-अप इंडिया में 25% से 35% सब्सिडी का दावा करने हेतु।",
          where_to_get: "तहसील कार्यालय / आपले सरकार सेवा केंद्र",
          time: "15 दिन",
          cost: "₹50",
        },
        itr_tax: {
          id: "itr_tax",
          name: "आयकर रिटर्न (ITR / फॉर्म 16) अथवा बिक्री बही (अंतिम 1-2 वर्ष)",
          category: "financial",
          why: "₹5 लाख से अधिक के ऋण (मुद्रा तरुण) अथवा ₹35,000+ मासिक आय वाले आवेदकों हेतु।",
          where_to_get: "आयकर ई-फाइलिंग पोर्टल / कर सलाहकार",
          time: "2 - 3 दिन",
          cost: "₹500 - ₹1,000",
        },
        income_cert: {
          id: "income_cert",
          name: "तहसीलदार आय प्रमाणपत्र / ग्राम सेवक स्वघोषणा",
          category: "financial",
          why: "छोटे मुद्रा शिशु ऋण हेतु कम आय वाले आवेदकों की पात्रता सिद्ध करने के लिए।",
          where_to_get: "तहसील कार्यालय / कॉमन सर्विस सेंटर (CSC)",
          time: "5 - 7 दिन",
          cost: "₹35",
        },
        edp_cert: {
          id: "edp_cert",
          name: "ईडीपी (उद्यमिता विकास प्रशिक्षण) प्रमाणपत्र",
          category: "legal",
          why: "PMEGP ऋण एवं सब्सिडी जारी करने हेतु अनिवार्य सरकारी प्रशिक्षण।",
          where_to_get: "RSETI / KVIC / उद्यमीमित्र ऑनलाइन पोर्टल",
          time: "5 - 10 दिन",
          cost: "निःशुल्क (सरकारी)",
        },
        land_extract: {
          id: "land_extract",
          name: "जमीन 7/12 उतारा अथवा पंजीकृत किरायानामा",
          category: "legal",
          why: "परियोजना स्थल पर व्यवसाय करने का वैध स्वामित्व अथवा लीज अधिकार सिद्ध करने हेतु।",
          where_to_get: "महाभूमि पोर्टल / उप-निबंधक कार्यालय",
          time: "1 - 3 दिन",
          cost: "₹20 - ₹200",
        },
      },
      mr: {
        aadhaar_pan: {
          id: "aadhaar_pan",
          name: "आधार कार्ड आणि पॅन कार्ड छायाप्रत",
          category: "legal",
          why: "मुद्रा / PMEGP बँक कर्ज खाते उघडण्यासाठी आणि सिबिल तपासणीसाठी प्राथमिक अनिवार्य KYC.",
          where_to_get: "UIDAI पोर्टल / NSDL केंद्र",
          time: "तात्काळ",
          cost: "शून्य",
        },
        photo_kyc: {
          id: "photo_kyc",
          name: "पासपोर्ट आकाराचे फोटो (3 प्रती) व मतदान ओळखपत्र / रेशनकार्ड",
          category: "legal",
          why: "बँक कर्ज प्रस्तावाची प्रत्यक्ष फाईल व स्थानिक रहिवासी पुराव्यासाठी आवश्यक.",
          where_to_get: "स्थानिक फोटो स्टुडिओ / ग्रामपंचायत",
          time: "1 दिवस",
          cost: "₹50",
        },
        bank_passbook: {
          id: "bank_passbook",
          name: "बँक पासबुक / खाते उतारा (मागील 6 महिने)",
          category: "financial",
          why: "आर्थिक स्थिरता, नियमित जमा-खर्च आणि नियमित व्यवहारांची खात्री करण्यासाठी.",
          where_to_get: "बँक शाखा / पासबुक प्रिंटर केंद्र",
          time: "1 दिवस",
          cost: "शून्य",
        },
        udyam: {
          id: "udyam",
          name: "उद्यम MSME नोंदणी प्रमाणपत्र",
          category: "legal",
          why: "शासकीय सबसिडी, सवलतीचे व्याजदर आणि मुद्रा बँक हमीसाठी अनिवार्य.",
          where_to_get: "Udyamregistration.gov.in (आधारद्वारे मोफत ऑनलाइन पोर्टल)",
          time: "1 - 2 दिवस",
          cost: "मोफत (शुल्क नाही)",
        },
        panchayat: {
          id: "panchayat",
          name: "ग्रामपंचायत ना-हरकत दाखला (NOC) / व्यवसाय परवाना",
          category: "legal",
          why: "गावात गोठा, शेड किंवा प्रक्रिया उद्योग सुरू करण्यासाठी आवश्यक स्थानिक परवानगी.",
          where_to_get: "ग्रामसेवक / ग्रामपंचायत कार्यालय",
          time: "3 - 5 दिवस",
          cost: "₹100 - ₹300",
        },
        quotation: {
          id: "quotation",
          name: "गाई / यंत्रसामग्री अधिकृत कोटेशन व प्रोफॉर्मा बिल",
          category: "financial",
          why: "कर्जाची रक्कम थेट विक्रेत्याला बँक खात्यातून देण्यासाठी आवश्यक. बँक रोख पैसे देत नाही.",
          where_to_get: "मान्यताप्राप्त पशुपालक किंवा यंत्रसामग्री डीलर",
          time: "1 - 2 दिवस",
          cost: "शून्य",
        },
        dpr_project: {
          id: "dpr_project",
          name: "सविस्तर प्रकल्प अहवाल (DPR) व 3 वर्षांचे नफा-तोटा अंदाजपत्रक",
          category: "financial",
          why: "बँक व्यवस्थापकास व्यवसायाची कर्ज परतफेड क्षमता (DSCR > 1.25) तपासण्यासाठी आवश्यक.",
          where_to_get: "GramUdyam AI अहवाल किंवा स्थानिक CA कार्यालय",
          time: "1 दिवस",
          cost: "GramUdyam AI वर मोफत",
        },
        dairy_card: {
          id: "dairy_card",
          name: "सहकारी दूध उत्पादक सभासद कार्ड व दूध पासबुक",
          category: "legal",
          why: "सह्याद्री / महानंद डेअरीला रोज दूध विक्रीची हमी आणि नियमित उत्पन्नाचा दाखला.",
          where_to_get: "स्थानिक सहकारी दूध डेअरी संस्था",
          time: "2 दिवस",
          cost: "₹50 - ₹100",
        },
        fssai: {
          id: "fssai",
          name: "FSSAI अन्न सुरक्षा नोंदणी प्रमाणपत्र",
          category: "legal",
          why: "दूध, तूप, दही, मसाले किंवा तेल स्वतःच्या नावाने पॅकिंग करून विकायचे असल्यास आवश्यक.",
          where_to_get: "FoSCoS ऑनलाइन पोर्टल (foscos.fssai.gov.in)",
          time: "7 दिवस",
          cost: "₹100 / वर्ष",
        },
        category_cert: {
          id: "category_cert",
          name: "जात प्रमाणपत्र (OBC / SC / ST विशेष प्रवर्ग)",
          category: "legal",
          why: "PMEGP किंवा स्टँड-अप इंडिया योजनेत 25% ते 35% अनुदान मिळवण्यासाठी आवश्यक.",
          where_to_get: "तहसील कार्यालय / आपले सरकार सेवा केंद्र (महाराष्ट्र)",
          time: "15 दिवस",
          cost: "₹50",
        },
        itr_tax: {
          id: "itr_tax",
          name: "आयकर विवरणपत्र (ITR / फॉर्म 16) किंवा विक्री वही (मागील 1-2 वर्षे)",
          category: "financial",
          why: "₹5 लाखांपेक्षा जास्त कर्जासाठी (मुद्रा तरुण) किंवा ₹35k+ मासिक उत्पन्न असल्यास आवश्यक.",
          where_to_get: "आयकर ई-फायलिंग पोर्टल / कर सल्लागार",
          time: "2 - 3 दिवस",
          cost: "₹500 - ₹1,000",
        },
        income_cert: {
          id: "income_cert",
          name: "तहसीलदार उत्पन्न दाखला / ग्रामसेवक स्वयंघोषणा",
          category: "financial",
          why: "लहान मुद्रा शिशु कर्जासाठी कमी उत्पन्नाची पात्रता सिद्ध करण्यासाठी.",
          where_to_get: "तलाठी / तहसीलदार कार्यालय / CSC केंद्र",
          time: "5 - 7 दिवस",
          cost: "₹35",
        },
        edp_cert: {
          id: "edp_cert",
          name: "ईडीपी (उद्योजकता विकास प्रशिक्षण) प्रमाणपत्र",
          category: "legal",
          why: "PMEGP योजनेतून कर्ज आणि सबसिडी मिळवण्यासाठी अनिवार्य शासकीय प्रशिक्षण.",
          where_to_get: "RSETI / KVIC / उद्यमीमित्र ऑनलाइन पोर्टल",
          time: "5 - 10 दिवस",
          cost: "मोफत (शासकीय)",
        },
        land_extract: {
          id: "land_extract",
          name: "जागेचा 7/12 सातबारा उतारा किंवा नोंदणीकृत भाडेकरार",
          category: "legal",
          why: "व्यवसाय सुरू असलेल्या जागेवर कायदेशीर ताबा असल्याचे सिद्ध करण्यासाठी.",
          where_to_get: "महाभूमी पोर्टल / दुय्यम निबंधक कार्यालय",
          time: "1 - 3 दिवस",
          cost: "₹20 - ₹200",
        },
      },
    }
  }, [])

  // Dynamic Rule Evaluator based on loanScheme, loanAmount, monthlyIncome, category, sector
  const dynamicDocumentList = useMemo<DocItem[]>(() => {
    const docsForLang = masterDocs[lang] || masterDocs.en
    const selectedKeys: string[] = []

    // 1. Mandatory Core KYC for everyone
    selectedKeys.push("aadhaar_pan", "photo_kyc", "bank_passbook", "udyam")

    // 2. Local permissions
    selectedKeys.push("panchayat")

    // 3. Asset Quotations (Mudra Kishore/Tarun, PMEGP, KCC or loan > ₹50,000)
    if (loanAmount > 50000 || loanScheme !== "mudra_shishu") {
      selectedKeys.push("quotation")
    }

    // 4. Project DPR (loan > ₹2,00,000 or PMEGP or Mudra Tarun)
    if (loanAmount > 200000 || loanScheme === "pmegp" || loanScheme === "mudra_tarun") {
      selectedKeys.push("dpr_project")
    }

    // 5. Sector Specific requirements
    if (sector === "dairy") {
      selectedKeys.push("dairy_card")
    }
    if (sector === "processing" || sector === "dairy") {
      selectedKeys.push("fssai")
    }

    // 6. Caste Certificate (if claiming special subsidy in PMEGP or category is OBC/SC/ST)
    if (loanScheme === "pmegp" || applicantCategory === "obc" || applicantCategory === "sc_st") {
      selectedKeys.push("category_cert")
    }

    // 7. EDP Training (mandatory for PMEGP)
    if (loanScheme === "pmegp") {
      selectedKeys.push("edp_cert")
    }

    // 8. Income proof vs ITR
    if (loanAmount > 500000 || monthlyIncome > 40000) {
      selectedKeys.push("itr_tax")
    } else if (loanAmount <= 100000 && monthlyIncome <= 25000) {
      selectedKeys.push("income_cert")
    }

    // 9. Land / Premises proof (loans > ₹3.5 Lakhs or PMEGP)
    if (loanAmount > 350000 || loanScheme === "pmegp") {
      selectedKeys.push("land_extract")
    }

    // Map keys to DocItem with checked state
    return selectedKeys
      .map((key) => {
        const item = docsForLang[key]
        if (!item) return null
        return {
          ...item,
          checked: !!checkedMap[key],
        }
      })
      .filter((d): d is DocItem => d !== null)
  }, [lang, masterDocs, loanScheme, loanAmount, monthlyIncome, applicantCategory, sector, checkedMap])

  // Filtered by Tab
  const visibleList = useMemo(() => {
    if (activeTab === "all") return dynamicDocumentList
    return dynamicDocumentList.filter((d) => d.category === activeTab)
  }, [dynamicDocumentList, activeTab])

  // Progress metrics calculated across the entire generated requirement set
  const completedCount = dynamicDocumentList.filter((d) => d.checked).length
  const totalCount = dynamicDocumentList.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const toggleDoc = (id: string) => {
    setCheckedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const markAll = () => {
    const updated: Record<string, boolean> = {}
    dynamicDocumentList.forEach((d) => {
      updated[d.id] = true
    })
    setCheckedMap((prev) => ({ ...prev, ...updated }))
  }

  const resetAll = () => {
    const updated: Record<string, boolean> = {}
    dynamicDocumentList.forEach((d) => {
      updated[d.id] = false
    })
    setCheckedMap((prev) => ({ ...prev, ...updated }))
  }

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerated(true)
    setShowForm(false)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header & Progress Summary Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-primary" />
            <span>{uiText.title}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {uiText.subtitle}
          </p>
        </div>

        {/* Readiness Progress Card (preserves original design requested by user) */}
        <div className="bg-card p-3 rounded-lg border border-border flex items-center gap-4 shadow-xs self-start sm:self-auto">
          <div>
            <div className="text-xs text-muted-foreground font-semibold uppercase">
              {uiText.readinessTitle}
            </div>
            <div className="text-lg font-bold text-foreground">
              {completedCount} / {totalCount} ({progressPct}%)
            </div>
          </div>
          <div className="w-16 bg-muted h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Criteria Form (Shown initially or when user toggles "Change Requirements") */}
      {(!isGenerated || showForm) && (
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="w-4.5 h-4.5 text-primary" />
                  <span>{uiText.formTitle}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {uiText.formDesc}
                </p>
              </div>
              {isGenerated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="text-xs border-border"
                >
                  {uiText.hideParams}
                </Button>
              )}
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Row 1: Loan Type and Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Loan Scheme */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    {uiText.loanTypeLabel}
                  </label>
                  <select
                    value={loanScheme}
                    onChange={(e) => setLoanScheme(e.target.value as LoanScheme)}
                    className="w-full text-xs font-medium bg-secondary/50 border border-border rounded-md px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="mudra_shishu">{uiText.schemes.mudra_shishu}</option>
                    <option value="mudra_kishore">{uiText.schemes.mudra_kishore}</option>
                    <option value="mudra_tarun">{uiText.schemes.mudra_tarun}</option>
                    <option value="pmegp">{uiText.schemes.pmegp}</option>
                    <option value="kcc">{uiText.schemes.kcc}</option>
                  </select>
                </div>

                {/* Loan Amount */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                    <span>{uiText.loanAmountLabel}</span>
                    <span className="text-primary font-bold">{formatCurrency(loanAmount)}</span>
                  </div>
                  <input
                    type="number"
                    min="10000"
                    max="5000000"
                    step="5000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full text-xs bg-secondary/50 border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {/* Quick amount presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[50000, 160000, 236000, 500000, 1000000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setLoanAmount(amt)}
                        className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                          loanAmount === amt
                            ? "bg-primary text-primary-foreground border-primary font-bold"
                            : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {formatCurrency(amt)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Monthly Income and Applicant Social Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Monthly Income */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                    <span>{uiText.incomeLabel}</span>
                    <span className="text-primary font-bold">{formatCurrency(monthlyIncome)}/mo</span>
                  </div>
                  <input
                    type="number"
                    min="5000"
                    max="500000"
                    step="2500"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    className="w-full text-xs bg-secondary/50 border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {/* Quick income presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[15000, 25000, 40000, 60000].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setMonthlyIncome(inc)}
                        className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                          monthlyIncome === inc
                            ? "bg-primary text-primary-foreground border-primary font-bold"
                            : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {formatCurrency(inc)}/mo
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    {uiText.categoryLabel}
                  </label>
                  <select
                    value={applicantCategory}
                    onChange={(e) => setApplicantCategory(e.target.value as SocialCategory)}
                    className="w-full text-xs font-medium bg-secondary/50 border border-border rounded-md px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="general">{uiText.categories.general}</option>
                    <option value="obc">{uiText.categories.obc}</option>
                    <option value="sc_st">{uiText.categories.sc_st}</option>
                    <option value="woman">{uiText.categories.woman}</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Business Activity / Sector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  {uiText.sectorLabel}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(["dairy", "processing", "manufacturing", "services", "custom"] as SectorType[]).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSector(sec)}
                      className={`p-2.5 rounded-md border text-left text-xs transition-all cursor-pointer ${
                        sector === sec
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      {uiText.sectors[sec]}
                    </button>
                  ))}
                </div>
                {sector === "custom" && (
                  <input
                    type="text"
                    value={customSectorName}
                    onChange={(e) => setCustomSectorName(e.target.value)}
                    placeholder={lang === "hi" ? "अपने व्यवसाय का नाम लिखें…" : lang === "mr" ? "तुमच्या व्यवसायाचे नाव लिहा…" : "Enter your business idea…"}
                    className="mt-2 w-full p-2.5 rounded-md border border-border bg-card text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                  />
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <Button type="submit" className="w-full flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerated ? uiText.updateBtn : uiText.generateBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active Profile Summary Pill Bar (When checklist is active) */}
      {isGenerated && !showForm && (
        <div className="p-3.5 rounded-lg border border-border bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {uiText.customChecklistFor}
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold border border-primary/25">
                {uiText.schemes[loanScheme]}
              </span>
              <span className="px-2 py-0.5 rounded bg-card text-foreground font-bold border border-border">
                {formatCurrency(loanAmount)}
              </span>
              <span className="px-2 py-0.5 rounded bg-card text-muted-foreground border border-border">
                {formatCurrency(monthlyIncome)}/mo
              </span>
              <span className="px-2 py-0.5 rounded bg-card text-muted-foreground border border-border">
                {uiText.categories[applicantCategory]}
              </span>
              <span className="px-2 py-0.5 rounded bg-card text-muted-foreground border border-border">
                {sector === "custom" && customSectorName ? customSectorName : uiText.sectors[sector]}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="text-xs border-border flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            <span>{uiText.editParams}</span>
          </Button>
        </div>
      )}

      {/* Checklist Header, Category Tabs & Quick Batch Actions */}
      {isGenerated && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-1">
            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "all"
                    ? "border-primary text-primary bg-primary/10"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {uiText.tabAll} ({dynamicDocumentList.length})
              </button>
              <button
                onClick={() => setActiveTab("legal")}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "legal"
                    ? "border-primary text-primary bg-primary/10"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {uiText.tabLegal} ({dynamicDocumentList.filter((d) => d.category === "legal").length})
              </button>
              <button
                onClick={() => setActiveTab("financial")}
                className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "financial"
                    ? "border-primary text-primary bg-primary/10"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {uiText.tabFinancial} ({dynamicDocumentList.filter((d) => d.category === "financial").length})
              </button>
            </div>

            {/* Quick check/uncheck batch buttons */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={markAll}
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>{uiText.markAll}</span>
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={resetAll}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{uiText.resetAll}</span>
              </button>
            </div>
          </div>

          {/* Document Items Checklist */}
          <div className="space-y-3">
            {visibleList.map((doc) => (
              <div
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                  doc.checked
                    ? "bg-muted/40 border-border opacity-85"
                    : "bg-card border-border hover:border-primary/50 shadow-xs"
                }`}
              >
                <div className="mt-0.5 text-primary">
                  {doc.checked ? (
                    <CheckSquare className="w-5 h-5 text-primary" />
                  ) : (
                    <Square className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span
                      className={`font-bold text-sm ${
                        doc.checked ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {doc.name}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {doc.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" /> {doc.cost}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{doc.why}</p>

                  <div className="text-[11px] text-muted-foreground bg-secondary/50 p-2.5 rounded border border-border">
                    <span className="font-semibold text-foreground">
                      {uiText.whereToGet}
                    </span>{" "}
                    {doc.where_to_get}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
export default DocumentsPage
