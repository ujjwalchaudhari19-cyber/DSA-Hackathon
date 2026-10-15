You are writing narrative sections for a GramUdyam AI business feasibility report.

## COMPUTED DATA — DO NOT CHANGE ANY NUMBER BELOW

### Entrepreneur Profile
{profile}

### Business Idea
{idea}

### Local Market Data (district: {district})
{local_data}

### Investment Breakdown
Total Investment: {total_investment}
Fixed Costs: {fixed_cost}
Working Capital: {working_capital}
Data Confidence: {data_confidence}

### Funding Gap
Available Capital: {available_capital}
Funding Gap: {gap}
Capital Coverage Ratio: {capital_ratio}

### Matched Government Schemes (top 3)
{schemes}

### Tailored Document Checklist
{document_checklist}

### 12-Month Financial Projection (base scenario with ramp-up)
Annual Revenue: {annual_revenue}
Annual Net Profit: {annual_net_profit}
Break-even Month: {break_even_months}

### Loan Repayment
Principal: {loan_amount}
Rate: {interest_rate}
EMI: {emi}
DSCR (base): {dscr}
Affordable: {affordable}

### Feasibility Score
Score: {score}/100
Verdict: {verdict}

### Credit Readiness
Bucket: {credit_bucket}

### Warnings from Number Engine
{warnings_text}

---

## WRITING RULES — FOLLOW EXACTLY

1. **Language:** Write ALL narrative text in {lang}. Keep JSON keys in English.
2. **Specificity:** Every section must cite at least TWO concrete values from the data above
   (₹ amounts, scheme names, month numbers, district name, score, competitor count, DSCR).
3. **Length:** Each string field: 2–4 sentences, minimum 40 characters.
4. **No filler:** Never write "has been completed", "please review", "review the detailed",
   "as mentioned above", or vague generalities. Every sentence must carry new information.
5. **Confidence honesty:** If data_confidence is "medium" or "approximate", write
   "figures are estimates based on regional averages" in market_summary and investment_summary.
6. **Demand/competition claims:** Only mention demand level, competitor count, or market
   advantage if those fields explicitly say so in local_data above. Never invent "first-mover",
   "underserved market", or sector linkages not present in the data.
7. **Warnings:** If warnings_text contains "optimistic_assumptions", tell the entrepreneur
   in plain language that projections assume high capacity utilisation and actual results
   may be lower. If it contains "weak_downside", warn that a 20% revenue drop would make
   the loan hard to service and recommend a contingency fund.
8. **SWOT grounding:** Every SWOTItem must have an evidence_key naming the exact input
   field that supports it. Drop any bullet you cannot ground in the data above.
9. **Recommendations:** 3–5 items, ordered by priority, each tied to a number or deadline.
10. **Next steps:** 3–5 items built from the scheme how_to_apply steps and the document
    checklist. Name what to do, where (URL or office), approximate time and cost.
    If the business is a food business (tiffin, dairy, flour mill, kirana), include
    FSSAI registration at foscos.fssai.gov.in as a step.
11. **Slide titles:** Provide slide_titles as a dict keyed "1" to "12". Each title is a
    full-sentence takeaway in {lang}, max 90 characters, that a reader would remember.

---

## TASK

Write the complete ReportNarrative JSON. Use every field in the schema below.
Return ONLY valid JSON. No markdown, no code fences, no text before or after.

### Output Schema
{schema_description}

### Retry feedback
{retry_hint}
