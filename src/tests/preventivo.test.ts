import { describe, it, expect } from 'vitest'
import { calculatePreventivo, generatePaymentPlan } from '@/utils/preventivo'

describe('calculatePreventivo', () => {
  it('calcola correttamente con IVA e ritenuta', () => {
    const result = calculatePreventivo(1000, 100, 0.22, true)
    expect(result.taxable_amount).toBe(1100)    // onorario + spese
    expect(result.vat_amount).toBe(220)          // 22% su solo onorario
    expect(result.withholding_tax).toBe(40)      // 20% * 20% * 1000
    expect(result.total_gross).toBe(1320)        // 1100 + 220
    expect(result.total_net).toBe(1280)          // 1320 - 40
  })

  it('calcola senza ritenuta d\'acconto per enti pubblici', () => {
    const result = calculatePreventivo(1000, 0, 0.22, false)
    expect(result.withholding_tax).toBe(0)
    expect(result.total_gross).toBe(result.total_net)
  })

  it('calcola con IVA zero per enti esenti', () => {
    const result = calculatePreventivo(1000, 0, 0, false)
    expect(result.vat_amount).toBe(0)
    expect(result.total_gross).toBe(1000)
  })
})

describe('generatePaymentPlan', () => {
  it('genera piano standard 30/70', () => {
    const plan = generatePaymentPlan(1000, 'standard')
    expect(plan).toHaveLength(2)
    expect(plan[0].percentage).toBe(30)
    expect(plan[0].amount).toBe(300)
    expect(plan[1].percentage).toBe(70)
    expect(plan[1].amount).toBe(700)
  })

  it('genera piano split thirds 33/33/34', () => {
    const plan = generatePaymentPlan(1000, 'split_thirds')
    expect(plan).toHaveLength(3)
    expect(plan[0].amount).toBe(330)
    expect(plan[1].amount).toBe(330)
    expect(plan[2].amount).toBe(340)
  })
})
