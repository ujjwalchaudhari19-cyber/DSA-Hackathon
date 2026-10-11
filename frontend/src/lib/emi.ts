/**
 * Client-side EMI calculator for instant slider feedback.
 * The backend validates all final numbers — this is just for UX responsiveness.
 */

export function calculateEmi(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 12 / 100
  if (r === 0) return principal / months
  const f = Math.pow(1 + r, months)
  return Math.round((principal * r * f) / (f - 1))
}

export function calculateTotalInterest(
  principal: number,
  annualRatePct: number,
  months: number
): number {
  const emi = calculateEmi(principal, annualRatePct, months)
  return emi * months - principal
}

export interface AmortRow {
  month: number
  emi: number
  interest: number
  principal: number
  balance: number
}

export function generateSchedule(
  principal: number,
  annualRatePct: number,
  months: number,
  moratorium = 0
): AmortRow[] {
  const rows: AmortRow[] = []
  const e = calculateEmi(principal, annualRatePct, months)
  const r = annualRatePct / 12 / 100
  let bal = principal

  for (let m = 1; m <= months; m++) {
    const interest = Math.round(bal * r)
    const principalPaid = m <= moratorium ? 0 : e - interest
    bal -= principalPaid
    rows.push({
      month: m,
      emi: m > moratorium ? e : interest,
      interest,
      principal: principalPaid,
      balance: Math.max(Math.round(bal), 0),
    })
  }

  return rows
}

