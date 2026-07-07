import { describe, expect, it } from 'vitest'
import { addMoney, formatMoney, fromMinor, isValidAmountInput, toMinor } from '@/lib/money'

describe('money minor units', () => {
  it('converts decimal strings to minor units', () => {
    expect(toMinor('1250.00')).toBe(125000)
    expect(toMinor('1250.5')).toBe(125050)
    expect(toMinor('0.05')).toBe(5)
    expect(toMinor(500)).toBe(50000)
  })

  it('rejects invalid amounts', () => {
    expect(() => toMinor('12.345')).toThrow()
    expect(() => toMinor('abc')).toThrow()
    expect(() => toMinor('1,250')).toThrow()
  })

  it('round-trips through fromMinor', () => {
    expect(fromMinor(toMinor('1250.75'))).toBe('1250.75')
    expect(fromMinor(toMinor('0.10'))).toBe('0.10')
  })

  it('adds amounts without float drift', () => {
    // 0.1 + 0.2 famously !== 0.3 in floats
    expect(addMoney('0.10', '0.20')).toBe('0.30')
    expect(addMoney('999999.99', '0.01')).toBe('1000000.00')
  })
})

describe('amount input validation', () => {
  it('accepts keypad-style input', () => {
    expect(isValidAmountInput('500')).toBe(true)
    expect(isValidAmountInput('1250.5')).toBe(true)
  })
  it('rejects zero, negatives and garbage', () => {
    expect(isValidAmountInput('0')).toBe(false)
    expect(isValidAmountInput('-5')).toBe(false)
    expect(isValidAmountInput('1.234')).toBe(false)
    expect(isValidAmountInput('')).toBe(false)
  })
})

describe('formatting', () => {
  it('formats whole DZD without decimals', () => {
    expect(formatMoney('1250.00', { locale: 'en' })).toBe('1,250 DZD')
  })
  it('keeps decimals when present', () => {
    expect(formatMoney('1250.50', { locale: 'en' })).toBe('1,250.50 DZD')
  })
  it('uses Arabic suffix with Latin digits for AR', () => {
    const formatted = formatMoney('1250000.00', { locale: 'ar' })
    expect(formatted).toContain('دج')
    expect(formatted).toMatch(/1.250.000/) // latn digits, locale-specific separators
  })
  it('handles large amounts', () => {
    expect(formatMoney('1250000.00', { locale: 'en' })).toBe('1,250,000 DZD')
  })
})
