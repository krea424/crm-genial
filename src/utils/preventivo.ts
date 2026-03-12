import type { PreventivoCalculation } from '@/types/database'

/**
 * Calcola tutti i valori fiscali di un preventivo professionale.
 * IVA standard 22%, ritenuta d'acconto 20% su 20% dell'imponibile (4% effettivo).
 */
export function calculatePreventivo(
  honorarium: number,
  expenses: number,
  vatRate: number = 0.22,
  applyWithholding: boolean = true
): PreventivoCalculation {
  const taxableAmount = parseFloat((honorarium + expenses).toFixed(2))
  const vatAmount = parseFloat((honorarium * vatRate).toFixed(2)) // IVA solo su onorario
  const withholdingTax = applyWithholding
    ? parseFloat((honorarium * 0.2 * 0.2).toFixed(2)) // 20% su 20%
    : 0
  const totalGross = parseFloat((taxableAmount + vatAmount).toFixed(2))
  const totalNet = parseFloat((totalGross - withholdingTax).toFixed(2))

  return {
    taxable_amount: taxableAmount,
    vat_amount: vatAmount,
    withholding_tax: withholdingTax,
    total_gross: totalGross,
    total_net: totalNet,
    honorarium,
    expenses,
    vat_rate: vatRate,
  }
}

type PaymentTemplate = 'standard' | 'split_thirds'

export interface PaymentStep {
  step_label: string
  amount: number
  percentage: number
}

/**
 * Genera il piano di pagamento in base al template scelto.
 * 'standard': 30% acconto + 70% saldo
 * 'split_thirds': 33% + 33% + 34%
 */
export function generatePaymentPlan(
  totalNet: number,
  template: PaymentTemplate = 'standard'
): PaymentStep[] {
  if (template === 'split_thirds') {
    return [
      {
        step_label: 'Prima rata (33%)',
        amount: parseFloat((totalNet * 0.33).toFixed(2)),
        percentage: 33,
      },
      {
        step_label: 'Seconda rata (33%)',
        amount: parseFloat((totalNet * 0.33).toFixed(2)),
        percentage: 33,
      },
      {
        step_label: 'Saldo (34%)',
        amount: parseFloat((totalNet * 0.34).toFixed(2)),
        percentage: 34,
      },
    ]
  }

  // template 'standard'
  return [
    {
      step_label: 'Acconto (30%)',
      amount: parseFloat((totalNet * 0.3).toFixed(2)),
      percentage: 30,
    },
    {
      step_label: 'Saldo (70%)',
      amount: parseFloat((totalNet * 0.7).toFixed(2)),
      percentage: 70,
    },
  ]
}
