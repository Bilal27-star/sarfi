/**
 * Global reference data every user needs: system categories (userId: null)
 * and achievement definitions. Shared between the full dev seed (which also
 * creates a demo user) and the production-safe seed that runs on every
 * build — it only ever upserts this global data, never touches user rows.
 */
import type { PrismaClient } from '../src/generated/prisma/client'

export type CategorySeed = {
  slug: string
  name: string
  icon: string
  color: string
  children?: { slug: string; name: string; icon: string }[]
}

export const SYSTEM_CATEGORIES: CategorySeed[] = [
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

export const ACHIEVEMENTS = [
  { key: 'first-expense', title: 'First step', description: 'Track your first expense', icon: 'sparkles' },
  { key: 'streak-7', title: 'One week strong', description: 'Track expenses 7 days in a row', icon: 'flame' },
  { key: 'streak-30', title: 'Habit built', description: 'Track expenses 30 days in a row', icon: 'trophy' },
  { key: 'under-budget', title: 'In control', description: 'Finish a month under budget', icon: 'shield-check' },
  { key: 'hundred-expenses', title: 'Century', description: 'Track 100 expenses', icon: 'medal' },
]

export async function seedSystemData(prisma: PrismaClient) {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({ where: { key: a.key }, update: a, create: a })
  }

  const categoryIdBySlug = new Map<string, string>()
  for (const [i, cat] of SYSTEM_CATEGORIES.entries()) {
    const existingParent = await prisma.category.findFirst({ where: { userId: null, slug: cat.slug } })
    const parent = existingParent
      ? await prisma.category.update({
          where: { id: existingParent.id },
          data: { name: cat.name, icon: cat.icon, color: cat.color, sortOrder: i },
        })
      : await prisma.category.create({
          data: { slug: cat.slug, name: cat.name, icon: cat.icon, color: cat.color, isSystem: true, sortOrder: i },
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

  return categoryIdBySlug
}
