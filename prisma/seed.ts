/**
 * SARFI seed — system categories, achievements, and a demo user with
 * ~10 weeks of realistic Algerian expense history so Home, Transactions
 * and Insights all feel coherent.
 *
 * Demo credentials: demo@sarfi.app / sarfi-demo
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

type CategorySeed = {
  slug: string
  name: string
  icon: string
  color: string
  children?: { slug: string; name: string; icon: string }[]
}

const SYSTEM_CATEGORIES: CategorySeed[] = [
  {
    slug: 'food',
    name: 'Food',
    icon: 'utensils',
    color: 'coral',
    children: [
      { slug: 'food-pizza', name: 'Pizza', icon: 'pizza' },
      { slug: 'food-restaurant', name: 'Restaurant', icon: 'utensils-crossed' },
      { slug: 'food-coffee', name: 'Coffee', icon: 'coffee' },
      { slug: 'food-fast-food', name: 'Fast food', icon: 'sandwich' },
      { slug: 'food-breakfast', name: 'Breakfast', icon: 'croissant' },
    ],
  },
  {
    slug: 'motorcycle',
    name: 'Motorcycle',
    icon: 'bike',
    color: 'blue',
    children: [
      { slug: 'moto-fuel', name: 'Fuel', icon: 'fuel' },
      { slug: 'moto-oil', name: 'Oil', icon: 'droplets' },
      { slug: 'moto-maintenance', name: 'Maintenance', icon: 'wrench' },
      { slug: 'moto-parts', name: 'Parts', icon: 'cog' },
      { slug: 'moto-wash', name: 'Wash', icon: 'shower-head' },
      { slug: 'moto-insurance', name: 'Insurance', icon: 'shield' },
    ],
  },
  {
    slug: 'groceries',
    name: 'Groceries',
    icon: 'shopping-basket',
    color: 'primary',
    children: [
      { slug: 'groceries-vegetables', name: 'Vegetables', icon: 'carrot' },
      { slug: 'groceries-fruits', name: 'Fruits', icon: 'apple' },
      { slug: 'groceries-general', name: 'General groceries', icon: 'shopping-cart' },
    ],
  },
  {
    slug: 'meat',
    name: 'Meat',
    icon: 'beef',
    color: 'danger',
    children: [
      { slug: 'meat-chicken', name: 'Chicken', icon: 'drumstick' },
      { slug: 'meat-beef', name: 'Beef', icon: 'beef' },
      { slug: 'meat-fish', name: 'Fish', icon: 'fish' },
    ],
  },
  { slug: 'transport', name: 'Transport', icon: 'bus', color: 'yellow' },
  { slug: 'home', name: 'Home', icon: 'home', color: 'purple' },
  { slug: 'health', name: 'Health', icon: 'heart-pulse', color: 'coral' },
  { slug: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: 'blue' },
  { slug: 'subscriptions', name: 'Subscriptions', icon: 'repeat', color: 'purple' },
  { slug: 'family', name: 'Family', icon: 'users', color: 'yellow' },
  { slug: 'education', name: 'Education', icon: 'graduation-cap', color: 'blue' },
  { slug: 'entertainment', name: 'Entertainment', icon: 'gamepad-2', color: 'primary' },
  { slug: 'other', name: 'Other', icon: 'circle-ellipsis', color: 'muted' },
]

const ACHIEVEMENTS = [
  { key: 'first-expense', title: 'First step', description: 'Track your first expense', icon: 'sparkles' },
  { key: 'streak-7', title: 'One week strong', description: 'Track expenses 7 days in a row', icon: 'flame' },
  { key: 'streak-30', title: 'Habit built', description: 'Track expenses 30 days in a row', icon: 'trophy' },
  { key: 'under-budget', title: 'In control', description: 'Finish a month under budget', icon: 'shield-check' },
  { key: 'hundred-expenses', title: 'Century', description: 'Track 100 expenses', icon: 'medal' },
]

// Deterministic pseudo-random so seeding is reproducible
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260706)

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

async function main() {
  console.log('Seeding SARFI…')

  // --- Achievements ---
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({ where: { key: a.key }, update: a, create: a })
  }

  // --- System categories ---
  const categoryIdBySlug = new Map<string, string>()
  for (const [i, cat] of SYSTEM_CATEGORIES.entries()) {
    const parent = await prisma.category.upsert({
      where: { userId_slug: { userId: null as unknown as string, slug: cat.slug } },
      update: { name: cat.name, icon: cat.icon, color: cat.color, sortOrder: i },
      create: { slug: cat.slug, name: cat.name, icon: cat.icon, color: cat.color, isSystem: true, sortOrder: i },
    }).catch(async () => {
      // upsert with null in compound unique isn't supported — fall back to find/create
      const existing = await prisma.category.findFirst({ where: { userId: null, slug: cat.slug } })
      if (existing) {
        return prisma.category.update({
          where: { id: existing.id },
          data: { name: cat.name, icon: cat.icon, color: cat.color, sortOrder: i },
        })
      }
      return prisma.category.create({
        data: { slug: cat.slug, name: cat.name, icon: cat.icon, color: cat.color, isSystem: true, sortOrder: i },
      })
    })
    categoryIdBySlug.set(cat.slug, parent.id)

    for (const [j, child] of (cat.children ?? []).entries()) {
      const existing = await prisma.category.findFirst({ where: { userId: null, slug: child.slug } })
      const data = {
        slug: child.slug,
        name: child.name,
        icon: child.icon,
        color: cat.color,
        isSystem: true,
        parentId: parent.id,
        sortOrder: j,
      }
      const c = existing
        ? await prisma.category.update({ where: { id: existing.id }, data })
        : await prisma.category.create({ data })
      categoryIdBySlug.set(child.slug, c.id)
    }
  }

  // --- Demo user ---
  const passwordHash = await bcrypt.hash('sarfi-demo', 10)
  const user = await prisma.user.upsert({
    where: { email: 'demo@sarfi.app' },
    update: {},
    create: {
      name: 'Bilal',
      email: 'demo@sarfi.app',
      passwordHash,
      preferredLanguage: 'EN',
      preferredCurrency: 'DZD',
      preferences: {
        create: { onboardingCompleted: true, setupCompleted: true, financialMonthStartDay: 1 },
      },
    },
  })

  // Idempotency: clear previous demo data
  await prisma.expense.deleteMany({ where: { userId: user.id } })
  await prisma.dailyTracking.deleteMany({ where: { userId: user.id } })
  await prisma.budget.deleteMany({ where: { userId: user.id } })
  await prisma.wallet.deleteMany({ where: { userId: user.id } })
  await prisma.recurringExpense.deleteMany({ where: { userId: user.id } })

  const cash = await prisma.wallet.create({
    data: { userId: user.id, name: 'Cash', type: 'CASH', icon: 'banknote', color: 'primary' },
  })
  const card = await prisma.wallet.create({
    data: { userId: user.id, name: 'CCP Card', type: 'CARD', icon: 'credit-card', color: 'blue' },
  })

  await prisma.budget.create({
    data: {
      userId: user.id,
      amount: '60000.00',
      currency: 'DZD',
      periodType: 'MONTHLY',
      startDate: new Date(Date.UTC(2026, 0, 1)),
    },
  })

  await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      categoryId: categoryIdBySlug.get('subscriptions')!,
      walletId: card.id,
      amount: '2500.00',
      description: 'Internet — Idoom Fibre',
      frequency: 'MONTHLY',
      nextDueDate: new Date(Date.UTC(2026, 7, 1)),
    },
  })

  // --- Expense history: ~10 weeks up to today ---
  type Item = { desc: string; slug: string; min: number; max: number; merchant?: string; wallet?: 'cash' | 'card' }
  const DAILY_POOL: Item[] = [
    { desc: 'Coffee', slug: 'food-coffee', min: 100, max: 200, merchant: 'Café El Bahdja' },
    { desc: 'Bread', slug: 'groceries-general', min: 30, max: 60 },
    { desc: 'Milk', slug: 'groceries-general', min: 140, max: 160 },
    { desc: 'Pizza', slug: 'food-pizza', min: 400, max: 700, merchant: 'Pizzeria Roma' },
    { desc: 'Fast food', slug: 'food-fast-food', min: 250, max: 550, merchant: 'Tacos DZ' },
    { desc: 'Breakfast', slug: 'food-breakfast', min: 120, max: 300 },
    { desc: 'Fuel', slug: 'moto-fuel', min: 100, max: 300, merchant: 'Naftal' },
    { desc: 'Bus ticket', slug: 'transport', min: 30, max: 60 },
    { desc: 'Taxi', slug: 'transport', min: 200, max: 500 },
    { desc: 'Vegetables', slug: 'groceries-vegetables', min: 400, max: 900, merchant: 'Marché couvert' },
    { desc: 'Fruits', slug: 'groceries-fruits', min: 300, max: 700, merchant: 'Marché couvert' },
    { desc: 'Chicken', slug: 'meat-chicken', min: 600, max: 1100, merchant: 'Boucherie El Baraka' },
    { desc: 'Beef', slug: 'meat-beef', min: 1200, max: 2400, merchant: 'Boucherie El Baraka' },
    { desc: 'Fish', slug: 'meat-fish', min: 800, max: 1600 },
    { desc: 'Snacks', slug: 'food-fast-food', min: 80, max: 200 },
    { desc: 'Pharmacy', slug: 'health', min: 250, max: 1200, merchant: 'Pharmacie Centrale' },
    { desc: 'Phone credit', slug: 'subscriptions', min: 200, max: 500, merchant: 'Djezzy', wallet: 'card' },
    { desc: 'Restaurant', slug: 'food-restaurant', min: 800, max: 1800 },
  ]
  const OCCASIONAL: Item[] = [
    { desc: 'Engine oil', slug: 'moto-oil', min: 450, max: 600, merchant: 'Naftal' },
    { desc: 'Motorcycle wash', slug: 'moto-wash', min: 150, max: 250 },
    { desc: 'Brake pads', slug: 'moto-parts', min: 1500, max: 3000 },
    { desc: 'T-shirt', slug: 'shopping', min: 1200, max: 2500 },
    { desc: 'Cleaning supplies', slug: 'home', min: 400, max: 900 },
    { desc: 'Gas bottle', slug: 'home', min: 200, max: 250 },
    { desc: 'Gift for family', slug: 'family', min: 1000, max: 3000 },
    { desc: 'Cinema', slug: 'entertainment', min: 400, max: 800 },
    { desc: 'Book', slug: 'education', min: 600, max: 1500 },
  ]

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const DAYS = 70
  const expenses: {
    userId: string
    walletId: string
    categoryId: string
    amount: string
    description: string
    merchant?: string | null
    expenseDate: Date
    currency: string
  }[] = []

  for (let d = DAYS; d >= 0; d--) {
    const day = new Date(startOfToday)
    day.setDate(day.getDate() - d)
    const weekday = day.getDay() // 0 Sun … 6 Sat

    // 2–5 expenses per day; Thursdays (souk/outing day) busier
    let count = 2 + Math.floor(rand() * 3)
    if (weekday === 4) count += 2
    if (rand() < 0.08) count = 0 // a few untracked days

    for (let i = 0; i < count; i++) {
      const pool = rand() < 0.15 ? OCCASIONAL : DAILY_POOL
      const item = pick(pool)
      const raw = item.min + rand() * (item.max - item.min)
      const amount = (Math.round(raw / 10) * 10).toFixed(2)
      const hour = 8 + Math.floor(rand() * 13)
      const date = new Date(day)
      date.setHours(hour, Math.floor(rand() * 60), 0, 0)
      if (d === 0 && date > today) date.setTime(today.getTime() - 1000 * 60 * (i + 1) * 37)
      expenses.push({
        userId: user.id,
        walletId: item.wallet === 'card' ? card.id : cash.id,
        categoryId: categoryIdBySlug.get(item.slug)!,
        amount,
        description: item.desc,
        merchant: item.merchant ?? null,
        expenseDate: date,
        currency: 'DZD',
      })
    }

    // Monthly internet on the 1st
    if (day.getDate() === 1) {
      const date = new Date(day)
      date.setHours(10, 15, 0, 0)
      expenses.push({
        userId: user.id,
        walletId: card.id,
        categoryId: categoryIdBySlug.get('subscriptions')!,
        amount: '2500.00',
        description: 'Internet',
        merchant: 'Idoom',
        expenseDate: date,
        currency: 'DZD',
      })
    }
  }

  // Guarantee the brief's canonical items exist recently
  const canonical: [string, string, string, string | null, number][] = [
    ['Pizza', '500.00', 'food-pizza', 'Pizzeria Roma', 0],
    ['Fuel', '100.00', 'moto-fuel', 'Naftal', 0],
    ['Coffee', '150.00', 'food-coffee', 'Café El Bahdja', 0],
    ['Chicken', '800.00', 'meat-chicken', 'Boucherie El Baraka', 1],
    ['Vegetables', '700.00', 'groceries-vegetables', 'Marché couvert', 1],
    ['Engine oil', '500.00', 'moto-oil', 'Naftal', 2],
  ]
  for (const [desc, amount, slug, merchant, daysAgo] of canonical) {
    const date = new Date(startOfToday)
    date.setDate(date.getDate() - daysAgo)
    date.setHours(9 + Math.floor(rand() * 9), Math.floor(rand() * 60), 0, 0)
    if (daysAgo === 0 && date > today) date.setTime(today.getTime() - 1000 * 60 * 15)
    expenses.push({
      userId: user.id,
      walletId: cash.id,
      categoryId: categoryIdBySlug.get(slug)!,
      amount,
      description: desc,
      merchant,
      expenseDate: date,
      currency: 'DZD',
    })
  }

  await prisma.expense.createMany({ data: expenses })

  // Daily tracking rows (streak data)
  const byDay = new Map<string, number>()
  for (const e of expenses) {
    const key = e.expenseDate.toISOString().slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + 1)
  }
  await prisma.dailyTracking.createMany({
    data: [...byDay.entries()].map(([date, n]) => ({
      userId: user.id,
      date: new Date(date),
      trackingCompleted: true,
      expenseCount: n,
    })),
  })

  // Unlock a couple of achievements for the demo user
  const first = await prisma.achievement.findUnique({ where: { key: 'first-expense' } })
  const streak = await prisma.achievement.findUnique({ where: { key: 'streak-7' } })
  for (const a of [first, streak]) {
    if (!a) continue
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: user.id, achievementId: a.id } },
      update: {},
      create: { userId: user.id, achievementId: a.id },
    })
  }

  console.log(`Seeded ${expenses.length} expenses for demo@sarfi.app`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
