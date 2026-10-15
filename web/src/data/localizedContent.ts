/**
 * localizedContent.ts
 *
 * Contains ONLY static UI labels, report section text, and localAnalysis
 * placeholder text used when the backend is not yet available.
 *
 * ALL scheme objects and investment-item lists have been removed — they are
 * now fetched at runtime from:
 *   GET /api/v1/schemes/all          → scheme cards
 *   GET /api/v1/finance/business-items → investment table items
 *
 * The `suggestions` arrays remain here as lightweight UI copy that can be
 * overridden by live discovery results from POST /api/v1/discover/suggest.
 */

import type { Lang, BusinessSuggestion } from "@/types"

export interface LocalizedContent {
  suggestions: BusinessSuggestion[]
  localAnalysis: {
    demandStats: { label: string; value: string; sub: string }[]
    demandPoints: string[]
    competitorPoints: string[]
    risks: { title: string; desc: string; type: "risk" | "opp" }[]
    scoreVerdict: string
  }
  report: {
    title: string
    subTitle: string
    verdictSummary: string
    formulaLabel: string
    formulaText: string
    kpis: {
      totalInvestLabel: string
      totalInvestSub: string
      capitalLabel: string
      capitalSub: string
      loanEmiLabel: string
      loanEmiSub: string
      breakEvenLabel: string
      breakEvenSub: string
      breakEvenValue: string
    }
    sec1Title: string
    sec1Text: string
    sec2Title: string
    sec2WhyTitle: string
    sec2Points: string[]
    sec3Title: string
    riskMitigationTitle: string
    riskMitigationText: string
    cibilRouteTitle: string
    cibilRouteText: string
    disclaimer: string
  }
}

export const contentByLang: Record<Lang, LocalizedContent> = {
  en: {
    suggestions: [
      {
        name: "Small Commercial Dairy Unit (4 Cows)",
        sector: "Dairy & Livestock",
        investment_range: [250000, 320000],
        monthly_income_range: [24000, 35000],
        difficulty: "medium",
        reason: "Strong local milk cooperative collection network in your district; high steady daily cashflow.",
      },
      {
        name: "Custom Flour & Spice Grinding Mill",
        sector: "Food Processing",
        investment_range: [180000, 240000],
        monthly_income_range: [18000, 28000],
        difficulty: "easy",
        reason: "Low perishable risk, year-round domestic village demand, qualifies for PM-FME micro subsidies.",
      },
      {
        name: "Two-Wheeler Repair & Spare Parts Counter",
        sector: "Rural Services",
        investment_range: [120000, 180000],
        monthly_income_range: [20000, 32000],
        difficulty: "easy",
        reason: "High concentration of motorcycles with minimal organized service within a 5 km radius.",
      },
      {
        name: "Cold-Pressed Edible Oil Expeller Unit",
        sector: "Agri Processing",
        investment_range: [350000, 480000],
        monthly_income_range: [32000, 50000],
        difficulty: "medium",
        reason: "High demand for pure groundnut/mustard oil among nearby semi-urban consumers.",
      },
    ],
    localAnalysis: {
      scoreVerdict: "High Feasibility Potential",
      demandStats: [
        { label: "Estimated Daily Demand", value: "—", sub: "Loading live data…" },
        { label: "Competitor Density", value: "—", sub: "Loading live data…" },
        { label: "Average Selling Price", value: "—", sub: "Loading live data…" },
      ],
      demandPoints: [
        "Local market demand analysis powered by district-level data.",
        "Revenue projections derived from NABARD/MSME indicative ranges.",
        "Seasonal cashflow patterns applied to monthly projection.",
      ],
      competitorPoints: [
        "Competitor density sourced from local market dataset.",
        "Market score reflects absorption capacity in the cluster.",
        "Supply-side inputs reviewed for availability risk.",
      ],
      risks: [
        {
          title: "Risk: Input Cost Volatility",
          desc: "Mitigation: Establish direct supplier linkages and maintain 30-day working capital buffer.",
          type: "risk",
        },
        {
          title: "Opportunity: Government Scheme Subsidy",
          desc: "Eligible for collateral-free credit under priority sector lending rates.",
          type: "opp",
        },
      ],
    },
    report: {
      title: "Generated Business Feasibility Document",
      subTitle: "Location: Verified Cluster • Applicant: Entrepreneur",
      verdictSummary:
        "The enterprise demonstrates strong localized market demand with viable financial return. Capital requirements and credit facilities have been evaluated based on official scheme guidelines.",
      formulaLabel: "Decision Formula:",
      formulaText: "Market(25%) + Capital(20%) + DSCR(25%) + Break-even(15%) + Risk(15%)",
      kpis: {
        totalInvestLabel: "Total Investment",
        totalInvestSub: "Fixed equipment + working capital",
        capitalLabel: "Own Capital",
        capitalSub: "Entrepreneur contribution",
        loanEmiLabel: "Proposed Loan (EMI)",
        loanEmiSub: "Term loan with moratorium",
        breakEvenLabel: "Break-even Period",
        breakEvenSub: "Healthy capital recovery",
        breakEvenValue: "12-18 Months",
      },
      sec1Title: "1. Local Market Demand & Economics",
      sec1Text:
        "Strong localized commercial demand exists within the immediate tehsil cluster. Initial operations are structured for high operational capacity utilization, generating healthy positive operating cash flow prior to debt service.",
      sec2Title: "2. Recommended Government Scheme",
      sec2WhyTitle: "Scheme Fit Analysis:",
      sec2Points: [
        "Project scale falls cleanly within national micro-enterprise credit brackets.",
        "Zero collateral requirement under CGTMSE credit guarantee coverage.",
        "Eligible for credit-linked subsidy or concessional interest rates under priority lending.",
      ],
      sec3Title: "3. Key Risks & Action Recommendations",
      riskMitigationTitle: "Operational & Raw Material Risk",
      riskMitigationText:
        "Mitigation: Establish direct supplier linkages and maintain 30-day working capital buffer for stable operations.",
      cibilRouteTitle: "Credit History & Banking Track Record",
      cibilRouteText:
        "Mitigation: Route all business transactions through a current account to build verifiable transaction history.",
      disclaimer:
        "Disclaimer: This report is generated algorithmically for business planning and feasibility assessment. Interest rates, loan sanction, and government subsidies are subject to individual bank appraisal and official scheme criteria.",
    },
  },
  hi: {
    suggestions: [
      {
        name: "व्यावसायिक लघु डेयरी इकाई (4 गायें)",
        sector: "डेयरी एवं पशुपालन",
        investment_range: [250000, 320000],
        monthly_income_range: [24000, 35000],
        difficulty: "medium",
        reason: "आपके जिले में स्थानीय सहकारी दूध संकलन नेटवर्क सक्रिय है; दैनिक स्थिर नकद प्रवाह।",
      },
      {
        name: "आटा, मसाला एवं बेसन पिसाई मिल",
        sector: "खाद्य प्रसंस्करण",
        investment_range: [180000, 240000],
        monthly_income_range: [18000, 28000],
        difficulty: "easy",
        reason: "सदाबहार मांग, कोई बर्बादी जोखिम नहीं, PM-FME योजना अंतर्गत सब्सिडी हेतु पात्र।",
      },
      {
        name: "दोपहिया वाहन मरम्मत व स्पेयर पार्ट्स दुकान",
        sector: "ग्रामीण सेवाएं",
        investment_range: [120000, 180000],
        monthly_income_range: [20000, 32000],
        difficulty: "easy",
        reason: "5 किमी दायरे में मोटरसाइकिलों की बहुतायत तथा संगठित सर्विसिंग की कमी।",
      },
      {
        name: "कोल्ड-प्रेस्ड खाद्य तेल एक्सपेलर यूनिट",
        sector: "कृषि प्रसंस्करण",
        investment_range: [350000, 480000],
        monthly_income_range: [32000, 50000],
        difficulty: "medium",
        reason: "नजदीकी कस्बों में शुद्ध मूंगफली/सरसों के तेल की उच्च मांग व अच्छा मुनाफा।",
      },
    ],
    localAnalysis: {
      scoreVerdict: "उच्च व्यवहार्यता संभावना",
      demandStats: [
        { label: "अनुमानित दैनिक मांग", value: "—", sub: "लाइव डेटा लोड हो रहा है…" },
        { label: "प्रतिस्पर्धी घनत्व", value: "—", sub: "लाइव डेटा लोड हो रहा है…" },
        { label: "औसत विक्री दर", value: "—", sub: "लाइव डेटा लोड हो रहा है…" },
      ],
      demandPoints: [
        "जिला स्तरीय डेटा के आधार पर स्थानीय बाज़ार मांग विश्लेषण।",
        "NABARD/MSME संकेतक श्रेणियों से राजस्व अनुमान तैयार।",
        "मासिक प्रक्षेपण में मौसमी नकद प्रवाह पैटर्न शामिल।",
      ],
      competitorPoints: [
        "स्थानीय बाज़ार डेटासेट से प्रतिस्पर्धी घनत्व।",
        "मार्केट स्कोर क्लस्टर में अवशोषण क्षमता दर्शाता है।",
        "कच्चे माल की उपलब्धता जोखिम की समीक्षा।",
      ],
      risks: [
        {
          title: "जोखिम: कच्चे माल की कीमतों में उतार-चढ़ाव",
          desc: "समाधान: विश्वसनीय आपूर्तिकर्ताओं से सीधा संपर्क स्थापित करें और 30 दिन की कार्यशील पूंजी बनाए रखें।",
          type: "risk",
        },
        {
          title: "अवसर: सरकारी योजना सब्सिडी",
          desc: "प्राथमिकता क्षेत्र ऋण दरों पर संपार्श्विक-मुक्त ऋण हेतु पात्र।",
          type: "opp",
        },
      ],
    },
    report: {
      title: "व्यवसाय व्यवहार्यता रिपोर्ट (कंप्यूटेड)",
      subTitle: "स्थान: लक्षित क्लस्टर • आवेदक: उद्यमी",
      verdictSummary:
        "यह उद्यम मजबूत स्थानीय मांग और वित्तीय लाभप्रदता प्रदर्शित करता है। पूंजीगत आवश्यकता और ऋण सुविधाएं आधिकारिक सरकारी दिशानिर्देशों के अनुरूप मूल्यांकित की गई हैं।",
      formulaLabel: "निर्णय सूत्र:",
      formulaText: "बाज़ार(25%) + पूंजी(20%) + DSCR(25%) + ब्रेक-ईवन(15%) + जोखिम(15%)",
      kpis: {
        totalInvestLabel: "कुल निवेश",
        totalInvestSub: "स्थिर उपकरण + कार्यशील पूंजी",
        capitalLabel: "स्वयं की पूंजी",
        capitalSub: "उद्यमी का अंशदान",
        loanEmiLabel: "प्रस्तावित ऋण (मासिक EMI)",
        loanEmiSub: "मोरेटोरियम सहित मियादी ऋण",
        breakEvenLabel: "ब्रेक-ईवन अवधि",
        breakEvenSub: "स्वस्थ पूंजी वापसी",
        breakEvenValue: "12-18 महीने",
      },
      sec1Title: "1. स्थानीय बाज़ार मांग एवं अर्थशास्त्र",
      sec1Text:
        "स्थानीय क्लस्टर में इस उद्यम की निरंतर वाणिज्यिक मांग उपलब्ध है। परिचालन क्षमता का समुचित उपयोग करके ऋण चुकाने से पहले संतोषजनक सकारात्मक नकद प्रवाह प्राप्त होता है।",
      sec2Title: "2. अनुशंसित सरकारी योजना",
      sec2WhyTitle: "योजना उपयुक्तता विश्लेषण:",
      sec2Points: [
        "परियोजना लागत राष्ट्रीय सूक्ष्म उद्यम ऋण सीमाओं के पूर्णतः अनुकूल है।",
        "CGTMSE गारंटी योजना के तहत किसी भी बैंक गारंटी या बंधक की आवश्यकता नहीं।",
        "प्राथमिकता प्राप्त क्षेत्र के तहत रियायती ब्याज दर अथवा क्रेडिट-लिंक्ड सब्सिडी की पात्रता।",
      ],
      sec3Title: "3. प्रमुख जोखिम एवं सुझाई गई सावधानियां",
      riskMitigationTitle: "कच्चा माल व परिचालन जोखिम",
      riskMitigationText:
        "समाधान: विश्वसनीय आपूर्तिकर्ताओं से सीधा संपर्क स्थापित करें और 30 दिन की कार्यशील पूंजी बनाए रखें।",
      cibilRouteTitle: "क्रेडिट इतिहास एवं बैंकिंग ट्रैक रिकॉर्ड",
      cibilRouteText:
        "समाधान: चालू खाते के माध्यम से सभी लेन-देन संचालित करें ताकि प्रामाणिक आय का रिकॉर्ड बन सके।",
      disclaimer:
        "अस्वीकरण: यह रिपोर्ट व्यावसायिक नियोजन और प्रारंभिक व्यवहार्यता हेतु तैयार की गई है। ब्याज दरें, ऋण स्वीकृति और सरकारी सब्सिडी बैंक के अंतिम मूल्यांकन पर निर्भर करती हैं।",
    },
  },
  mr: {
    suggestions: [
      {
        name: "व्यावसायिक दुग्धव्यवसाय युनिट (4 गाई)",
        sector: "दुग्धव्यवसाय व पशुपालन",
        investment_range: [250000, 320000],
        monthly_income_range: [24000, 35000],
        difficulty: "medium",
        reason: "तुमच्या तालुक्यात सह्याद्री सहकारी डेअरीचे थेट संकलन जाळे उपलब्ध; रोजचे हमखास उत्पन्न.",
      },
      {
        name: "मसाला, डाळ व धान्य गिरणी",
        sector: "अन्न प्रक्रिया",
        investment_range: [180000, 240000],
        monthly_income_range: [18000, 28000],
        difficulty: "easy",
        reason: "बारामाही स्थानिक घरगुती मागणी, नाशवंत होण्याचा धोका नाही, PM-FME सबसिडी पात्र.",
      },
      {
        name: "दुचाकी गॅरेज व स्पेअर पार्ट्स विक्री",
        sector: "ग्रामीण सेवा",
        investment_range: [120000, 180000],
        monthly_income_range: [20000, 32000],
        difficulty: "easy",
        reason: "5 किमी परिसरात वाहनांची मोठी संख्या, परंतु जवळ सुसज्ज गॅरेजची वानवा.",
      },
      {
        name: "लाकडी घाणा खाद्यतेल निर्मिती युनिट",
        sector: "कृषी प्रक्रिया",
        investment_range: [350000, 480000],
        monthly_income_range: [32000, 50000],
        difficulty: "medium",
        reason: "शुद्ध शेंगदाणा व करडई तेलाला शहरात मोठी पसंती व चांगला नफा दर.",
      },
    ],
    localAnalysis: {
      scoreVerdict: "उच्च व्यवहार्यता क्षमता",
      demandStats: [
        { label: "अंदाजित दैनंदिन मागणी", value: "—", sub: "लाइव्ह डेटा लोड होत आहे…" },
        { label: "स्थानिक स्पर्धा घनता", value: "—", sub: "लाइव्ह डेटा लोड होत आहे…" },
        { label: "सरासरी विक्री दर", value: "—", sub: "लाइव्ह डेटा लोड होत आहे…" },
      ],
      demandPoints: [
        "जिल्हा-स्तरीय डेटाद्वारे स्थानिक बाजार मागणीचे विश्लेषण.",
        "NABARD/MSME निर्देशक श्रेणींमधून महसूल अंदाज.",
        "मासिक अंदाजात हंगामी रोख प्रवाह नमुने वापरले.",
      ],
      competitorPoints: [
        "स्थानिक बाजार डेटासेटमधून स्पर्धा घनता.",
        "मार्केट स्कोर क्लस्टरमधील शोषण क्षमता दर्शवतो.",
        "कच्च्या मालाच्या उपलब्धतेच्या जोखमीचे मूल्यमापन.",
      ],
      risks: [
        {
          title: "जोखीम: निविष्ठा खर्चात चढउतार",
          desc: "उपाय: विश्वासू पुरवठादारांशी थेट करार करा आणि 30 दिवसांचे खेळते भांडवल राखून ठेवा.",
          type: "risk",
        },
        {
          title: "संधी: सरकारी योजना अनुदान",
          desc: "प्राधान्य क्षेत्रांतर्गत विनातारण कर्ज उपलब्ध.",
          type: "opp",
        },
      ],
    },
    report: {
      title: "व्यवसाय व्यवहार्यता अहवाल (अंतिम)",
      subTitle: "स्थान: लक्षित क्लस्टर • अर्जदार: उद्योजक",
      verdictSummary:
        "हा व्यवसाय उत्कृष्ट स्थानिक बाजारपेठ मागणी आणि आर्थिक परतावा दर्शवितो. प्रकल्प खर्च आणि कर्ज सुविधा सरकारी योजनांच्या निकषांनुसार मूल्यांकित करण्यात आल्या आहेत.",
      formulaLabel: "मूल्यांकन सूत्र:",
      formulaText: "बाजारपेठ(25%) + भांडवल(20%) + DSCR(25%) + नफा कालावधी(15%) + जोखीम(15%)",
      kpis: {
        totalInvestLabel: "एकूण प्रकल्प खर्च",
        totalInvestSub: "यंत्रसामग्री + कार्यशील भांडवल",
        capitalLabel: "स्वतःचे भांडवल",
        capitalSub: "उद्योजकाचा स्वतःचा हिस्सा",
        loanEmiLabel: "प्रस्तावित कर्ज हप्ता (EMI)",
        loanEmiSub: "सवलतीसह मियादी कर्ज",
        breakEvenLabel: "गुंतवणूक परतावा काळ",
        breakEvenSub: "चांगला नफा परतावा",
        breakEvenValue: "12-18 महिने",
      },
      sec1Title: "1. स्थानिक बाजार मागणी आणि अर्थकारण",
      sec1Text:
        "स्थानिक बाजारपेठेत या व्यवसायाला सातत्यपूर्ण मागणी आहे. उत्पादन क्षमतेचा योग्य वापर करून कर्ज हप्ता भरण्यापूर्वी समाधानकारक रोख नफा प्राप्त होतो.",
      sec2Title: "2. शिफारस केलेली सरकारी योजना",
      sec2WhyTitle: "योजना उपयुक्तता विश्लेषण:",
      sec2Points: [
        "प्रकल्प खर्च राष्ट्रीय सूक्ष्म उद्योग कर्ज मर्यादेमध्ये योग्य प्रकारे बसतो.",
        "CGTMSE अंतर्गत कोणतेही शेतजमीन किंवा घर गहाण ठेवण्याची गरज नाही.",
        "प्राधान्य क्षेत्रांतर्गत सवलतीचा व्याजदर किंवा सबसिडी उपलब्ध.",
      ],
      sec3Title: "3. प्रमुख जोखीम आणि उपाययोजना",
      riskMitigationTitle: "कच्चा माल व कामकाज जोखीम",
      riskMitigationText:
        "उपाय: विश्वासू पुरवठादारांशी थेट करार करा आणि 30 दिवसांचे खेळते भांडवल राखून ठेवा.",
      cibilRouteTitle: "क्रेडिट इतिहास व बँक व्यवहार",
      cibilRouteText:
        "उपाय: चालू खात्याद्वारे (Current Account) सर्व आर्थिक व्यवहार करून अधिकृत आर्थिक इतिहास तयार करा.",
      disclaimer:
        "सूचना: हा अहवाल व्यावसायिक नियोजन व व्यवहार्यतेच्या अभ्यासासाठी तैयार केला आहे. अंतिम कर्ज मंजुरी, व्याजदर आणि अनुदान हे बँकेच्या प्रत्यक्ष तपासणीवर अवलंबून असतील.",
    },
  },
}
