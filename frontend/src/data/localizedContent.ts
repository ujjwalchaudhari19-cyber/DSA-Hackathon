import type { Lang, Scheme, InvestmentItem, BusinessSuggestion } from "@/types"

export interface LocalizedContent {
  schemes: Scheme[]
  investmentItems: InvestmentItem[]
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
    schemes: [
      {
        id: "mudra_kishore",
        name: "Pradhan Mantri Mudra Yojana (Kishore)",
        type: "Micro-Credit Refinance",
        agency: "Ministry of Finance / Public Sector Banks",
        eligible: "yes",
        reasons: ["Loan amount ₹50,000 to ₹5,00,000", "Micro-enterprise, manufacturing, service & processing covered"],
        benefits: "No collateral required. Standard priority sector interest rate concession.",
        interest_range: "8.5% - 10.5% p.a.",
        collateral: "Nil (CGTMSE Covered)",
        how_to_apply: ["Submit Udyam & quotations to local Bank of Maharashtra or SBI branch."],
        source_url: "https://www.mudra.org.in/",
        last_verified: "2026-10-11",
      },
      {
        id: "pmegp",
        name: "Prime Minister Employment Generation Programme (PMEGP)",
        type: "Credit Linked Subsidy",
        agency: "KVIC / KVIB / DIC",
        eligible: "yes",
        reasons: [
          "Women / OBC special category: 35% margin money subsidy in rural areas",
          "Beneficiary contribution only 5%",
        ],
        benefits: "35% government capital subsidy on project cost.",
        interest_range: "10.0% - 11.5% p.a.",
        collateral: "No collateral up to ₹10 Lakhs",
        how_to_apply: ["Apply online via PMEGP e-portal with DPR and category certificate."],
        source_url: "https://www.kviconline.gov.in/pmegpeportal/",
        last_verified: "2026-10-11",
      },
      {
        id: "standup_india",
        name: "Stand-Up India Scheme",
        type: "SC/ST and Women Enterprise Loan",
        agency: "SIDBI / Scheduled Commercial Banks",
        eligible: "maybe",
        reasons: ["Women entrepreneurs eligible, but min loan ticket size is typically ₹10 Lakhs."],
        benefits: "Composite loan covering term loan + working capital.",
        interest_range: "Base Rate + 3%",
        collateral: "Credit Guarantee (CGSUS)",
        how_to_apply: ["Standupmitra portal."],
        source_url: "https://www.standupmitra.in/",
        last_verified: "2026-10-11",
      },
    ],
    investmentItems: [
      { name: "Indigenous Milking Cows (Gir/Sahiwal)", qty: 4, unit_cost: 45000, total: 180000 },
      { name: "Cattle Shed Setup & Feed Troughs", qty: 1, unit_cost: 35000, total: 35000 },
      { name: "Chaff Cutter & Stainless Cans", qty: 1, unit_cost: 20000, total: 20000 },
      { name: "Initial Concentrated Feed & Minerals (2 mo)", qty: 1, unit_cost: 25000, total: 25000 },
      { name: "Working Capital Reserve & Contingency (10%)", qty: 1, unit_cost: 26000, total: 26000 },
    ],
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
        { label: "Estimated Daily Demand", value: "350 - 500 Litres", sub: "Within 4 km cluster radius" },
        { label: "Competitor Density", value: "Moderate (6 units)", sub: "Absorption capacity remains unfulfilled" },
        { label: "Average Milk Gate Price", value: "₹38 - ₹42 / Litre", sub: "Direct collection by Sahyadri Dairy" },
      ],
      demandPoints: [
        "Bulk off-take guaranteed by local cooperative chilling center (2.2 km away).",
        "Daily household consumption in nearby township growing at 8% annually.",
        "Secondary revenue: Organic dung slurry sold to neighboring grape vineyards.",
      ],
      competitorPoints: [
        "Most existing producers are unorganized household herds with 1-2 cows.",
        "Lack of cold chain storage among competitors creates evening wastage risk.",
        "Your proposed 4-cow batch model enables stable, consistent morning shipments.",
      ],
      risks: [
        {
          title: "Risk: Dry Fodder Price Surge",
          desc: "Mitigation: Tie up silage storage or green fodder inter-cropping early.",
          type: "risk",
        },
        {
          title: "Opportunity: Mudra Kishore Subsidy",
          desc: "Animal husbandry qualifies for collateral-free credit under priority sector rates.",
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
    schemes: [
      {
        id: "mudra_kishore",
        name: "प्रधानमंत्री मुद्रा योजना (किशोर)",
        type: "माइक्रो-क्रेडिट पुनर्वित्त",
        agency: "वित्त मंत्रालय / सार्वजनिक क्षेत्र के बैंक",
        eligible: "yes",
        reasons: ["ऋण राशि ₹50,000 से ₹5,00,000 के बीच", "सूक्ष्म उद्योग, विनिर्माण, प्रसंस्करण एवं सेवाएं शामिल"],
        benefits: "कोई संपार्श्विक (कोलैटरल) आवश्यक नहीं। प्राथमिकता क्षेत्र रियायती ब्याज दर।",
        interest_range: "8.5% - 10.5% प्रति वर्ष",
        collateral: "शून्य (CGTMSE गारंटी द्वारा सुरक्षित)",
        how_to_apply: ["उद्यम प्रमाणपत्र एवं कोटेशन के साथ स्थानीय बैंक ऑफ महाराष्ट्र या SBI शाखा में संपर्क करें।"],
        source_url: "https://www.mudra.org.in/",
        last_verified: "2026-10-11",
      },
      {
        id: "pmegp",
        name: "प्रधानमंत्री रोजगार सृजन कार्यक्रम (PMEGP)",
        type: "क्रेडिट लिंक्ड पूंजीगत सब्सिडी",
        agency: "KVIC / KVIB / DIC",
        eligible: "yes",
        reasons: [
          "महिला / अन्य पिछड़ा वर्ग (OBC): ग्रामीण क्षेत्रों में 35% मार्जिन मनी सब्सिडी",
          "लाभार्थी का स्वयं का योगदान केवल 5%",
        ],
        benefits: "परियोजना लागत पर 35% सरकारी पूंजीगत सब्सिडी।",
        interest_range: "10.0% - 11.5% प्रति वर्ष",
        collateral: "₹10 लाख तक कोई कोलैटरल नहीं",
        how_to_apply: ["विस्तृत प्रोजेक्ट रिपोर्ट और जाति प्रमाणपत्र के साथ PMEGP ई-पोर्टल पर ऑनलाइन आवेदन करें।"],
        source_url: "https://www.kviconline.gov.in/pmegpeportal/",
        last_verified: "2026-10-11",
      },
      {
        id: "standup_india",
        name: "स्टैंड-अप इंडिया योजना",
        type: "महिला एवं अनुसूचित वर्ग उद्यमिता ऋण",
        agency: "SIDBI / वाणिज्यिक बैंक",
        eligible: "maybe",
        reasons: ["महिला उद्यमी पात्र हैं, परंतु न्यूनतम ऋण सीमा ₹10 लाख है।"],
        benefits: "सावधि ऋण और कार्यशील पूंजी का समग्र ऋण पैकेज।",
        interest_range: "बेस रेट + 3%",
        collateral: "क्रेडिट गारंटी (CGSUS)",
        how_to_apply: ["स्टैंडअपमित्र पोर्टल के माध्यम से आवेदन करें।"],
        source_url: "https://www.standupmitra.in/",
        last_verified: "2026-10-11",
      },
    ],
    investmentItems: [
      { name: "स्वदेशी दुधारू गायें (गीर/साहीवाल)", qty: 4, unit_cost: 45000, total: 180000 },
      { name: "पशु शेड निर्माण व खुरली व्यवस्था", qty: 1, unit_cost: 35000, total: 35000 },
      { name: "कुट्टी मशीन व स्टेनलेस स्टील के डिब्बे", qty: 1, unit_cost: 20000, total: 20000 },
      { name: "प्रारंभिक संतुलित चारा व खनिज मिश्रण (2 माह)", qty: 1, unit_cost: 25000, total: 25000 },
      { name: "कार्यशील पूंजी व आकस्मिक व्यय (10%)", qty: 1, unit_cost: 26000, total: 26000 },
    ],
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
        { label: "अनुमानित दैनिक मांग", value: "350 - 500 लीटर", sub: "4 किमी क्लस्टर दायरे में" },
        { label: "प्रतिस्पर्धी घनत्व", value: "मध्यम (6 इकाइयां)", sub: "बाज़ार में मांग की कमी नहीं है" },
        { label: "औसत दूध खरीद दर", value: "₹38 - ₹42 / लीटर", sub: "सह्याद्री डेयरी द्वारा सीधा संकलन" },
      ],
      demandPoints: [
        "स्थानीय सहकारी शीतलन केंद्र (2.2 किमी दूर) द्वारा संपूर्ण दूध खरीद की गारंटी।",
        "नजदीकी कस्बे में घरेलू दूध खपत 8% वार्षिक दर से बढ़ रही है।",
        "अतिरिक्त आय: गोबर की स्लरी पास के अंगूर बागानों को जैविक खाद के रूप में बिक्री।",
      ],
      competitorPoints: [
        "अधिकांश स्थानीय उत्पादक 1-2 गायों वाले असंगठित घरेलू चरवाहे हैं।",
        "प्रतिस्पर्धियों में कोल्ड स्टोरेज न होने से शाम के दूध के खराब होने का डर रहता है।",
        "आपकी 4 गायों की योजना सुबह की स्थिर व गुणवत्तापूर्ण आपूर्ति सुनिश्चित करती है।",
      ],
      risks: [
        {
          title: "जोखिम: सूखे चारे की कीमतों में उछाल",
          desc: "समाधान: साइलेज भंडारण या हरी घास की अंतःफसल पहले से तय करें।",
          type: "risk",
        },
        {
          title: "अवसर: मुद्रा किशोर सब्सिडी",
          desc: "पशुपालन गतिविधियां रियायती ब्याज दरों पर संपार्श्विक-मुक्त ऋण हेतु पात्र हैं।",
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
    schemes: [
      {
        id: "mudra_kishore",
        name: "प्रधानमंत्री मुद्रा योजना (किशोर)",
        type: "मायक्रो-क्रेडिट पुनर्वित्त",
        agency: "वित्त मंत्रालय / राष्ट्रीयकृत बँका",
        eligible: "yes",
        reasons: ["कर्ज रक्कम ₹50,000 ते ₹5,00,000 दरम्यान", "सूक्ष्म उद्योग, उत्पादन, प्रक्रिया व सेवा व्यवसाय समाविष्ट"],
        benefits: "कोणत्याही तारण (मॉर्गेज) ची आवश्यकता नाही. प्राधान्य क्षेत्रांतर्गत सवलतीचा व्याजदर.",
        interest_range: "8.5% - 10.5% प्रति वर्ष",
        collateral: "शून्य (CGTMSE हमीद्वारे सुरक्षित)",
        how_to_apply: ["उद्यम नोंदणी व कोटेशनसह स्थानिक बँक ऑफ महाराष्ट्र किंवा SBI शाखेत संपर्क करा."],
        source_url: "https://www.mudra.org.in/",
        last_verified: "2026-10-11",
      },
      {
        id: "pmegp",
        name: "पंतप्रधान रोजगार निर्मिती कार्यक्रम (PMEGP)",
        type: "क्रेडिट लिंक्ड भांडवली अनुदान",
        agency: "KVIC / KVIB / जिल्हा उद्योग केंद्र (DIC)",
        eligible: "yes",
        reasons: [
          "महिला / OBC विशेष प्रवर्ग: ग्रामीण भागात 35% सबसिडी (अनुदान)",
          "स्वतःचे योगदान फक्त 5%",
        ],
        benefits: "प्रकल्प खर्चावर 35% थेट सरकारी भांडवली अनुदान.",
        interest_range: "10.0% - 11.5% प्रति वर्ष",
        collateral: "₹10 लाखांपर्यंत कोणतेही तारण नाही",
        how_to_apply: ["विस्तृत प्रकल्प अहवाल (DPR) आणि जात प्रमाणपत्रासह PMEGP पोर्टलवर ऑनलाइन अर्ज करा."],
        source_url: "https://www.kviconline.gov.in/pmegpeportal/",
        last_verified: "2026-10-11",
      },
      {
        id: "standup_india",
        name: "स्टँड-अप इंडिया योजना",
        type: "महिला व अनुसूचित वर्ग व्यवसाय कर्ज",
        agency: "SIDBI / व्यापारी बँका",
        eligible: "maybe",
        reasons: ["महिला उद्योजिका पात्र, परंतु किमान कर्ज मर्यादा ₹10 लाख आहे."],
        benefits: "मुदत कर्ज आणि खेळते भांडवल यांचे एकत्रित कर्ज.",
        interest_range: "बेस रेट + 3%",
        collateral: "क्रेडिट गॅरंटी (CGSUS)",
        how_to_apply: ["स्टँडअपमित्र पोर्टलवरून ऑनलाइन अर्ज करा."],
        source_url: "https://www.standupmitra.in/",
        last_verified: "2026-10-11",
      },
    ],
    investmentItems: [
      { name: "गावरान/गीर दुभत्या गाई (4 गाई)", qty: 4, unit_cost: 45000, total: 180000 },
      { name: "गोठा शेड बांधकाम व गव्हाण व्यवस्था", qty: 1, unit_cost: 35000, total: 35000 },
      { name: "कडबा कुट्टी मशीन व स्टीलच्या चरव्या", qty: 1, unit_cost: 20000, total: 20000 },
      { name: "सुरुवातीचा पशुखाद्य व मिनरल मिक्स्चर साठा (2 महिने)", qty: 1, unit_cost: 25000, total: 25000 },
      { name: "खेळते भांडवल व आकस्मिक खर्च राखीव निधी (10%)", qty: 1, unit_cost: 26000, total: 26000 },
    ],
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
        { label: "अंदाजित दैनंदिन मागणी", value: "350 - 500 लिटर", sub: "4 किमी क्लस्टर परिसरामध्ये" },
        { label: "स्थानिक स्पर्धा घनता", value: "मध्यम (6 युनिट्स)", sub: "बाजारपेठेत दुधाला पूर्ण उठाव आहे" },
        { label: "सरासरी दूध खरेदी दर", value: "₹38 - ₹42 / लिटर", sub: "सह्याद्री डेअरीकडून थेट गावातून संकलन" },
      ],
      demandPoints: [
        "स्थानिक सहकारी दूध शीतकरण केंद्राकडून (2.2 किमी) संपूर्ण दूध उचलण्याची हमी.",
        "जवळच्या बाजारपेठेत व तालुक्यात दुधाचा दररोजचा खप वार्षिक 8% ने वाढतो आहे.",
        "दुय्यम उत्पन्न: शेणखत आणि स्लरी द्राक्ष बागायतदारांना विक्री करून अतिरिक्त नफा.",
      ],
      competitorPoints: [
        "सध्याचे बहुतांश उत्पादक 1-2 गाई पाळणारे असंघटित शेतकरी आहेत.",
        "इतर उत्पादकांकडे चिलिंग यंत्रणा नसल्याने संध्याकाळचे दूध टिकवण्याची अडचण येते.",
        "तुमच्या 4 गाईंच्या युनिटमुळे दररोज सकाळी स्वच्छ व दर्जेदार पुरवठा शक्य होईल.",
      ],
      risks: [
        {
          title: "जोखीम: सुक्या चाऱ्याच्या दरात वाढ",
          desc: "उपाय: सायलेज (मुरघास) साठा आणि मका आंतरपीक नियोजन आधीच करा.",
          type: "risk",
        },
        {
          title: "संधी: मुद्रा किशोर सबसिडी कर्ज",
          desc: "पशुपालन व्यवसायाला प्राधान्य क्षेत्रांतर्गत विनातारण कर्ज उपलब्ध होते.",
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
        "सूचना: हा अहवाल व्यावसायिक नियोजन व व्यवहार्यतेच्या अभ्यासासाठी तयार केला आहे. अंतिम कर्ज मंजुरी, व्याजदर आणि अनुदान हे बँकेच्या प्रत्यक्ष तपासणीवर अवलंबून असतील.",
    },
  },
}

