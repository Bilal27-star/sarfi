import { describe, expect, it } from 'vitest'
import { LocalRuleParser } from '@/lib/ai/expense-parser'

const parser = new LocalRuleParser()

describe('LocalRuleParser (Darija/French/English)', () => {
  it('parses "شريت بيتزا بـ 500 دج"', async () => {
    const result = await parser.parse('شريت بيتزا بـ 500 دج')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ description: 'Pizza', amount: '500.00', currency: 'DZD', categorySlug: 'food-pizza' })
  })

  it('parses "درت 100 دج بنزين"', async () => {
    const result = await parser.parse('درت 100 دج بنزين')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ description: 'Fuel', amount: '100.00', categorySlug: 'moto-fuel' })
  })

  it('splits "شريت دجاج 800 وخضر 700" into two candidates', async () => {
    const result = await parser.parse('شريت دجاج 800 وخضر 700')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ amount: '800.00', categorySlug: 'meat-chicken' })
    expect(result[1]).toMatchObject({ amount: '700.00', categorySlug: 'groceries-vegetables' })
  })

  it('parses English input', async () => {
    const result = await parser.parse('coffee 150 and taxi 300')
    expect(result).toHaveLength(2)
    expect(result[0].categorySlug).toBe('food-coffee')
    expect(result[1].categorySlug).toBe('transport')
  })

  it('returns empty for text without amounts', async () => {
    expect(await parser.parse('bonjour')).toHaveLength(0)
  })
})
