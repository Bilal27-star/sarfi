import { db } from '@/server/db'

export type ManagedCategory = {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  isSystem: boolean
  isOwn: boolean
  hidden: boolean
  sortOrder: number
  /** Own categories only — expenses/budgets/recurring templates referencing
   * this category. Used to warn before delete (>0 means delete archives
   * instead of removing). Always 0 for system categories. */
  usageCount: number
  children: {
    id: string
    name: string
    slug: string
    icon: string
    color: string
    isSystem: boolean
  }[]
}

/** Full list for the management screen — includes hidden system categories
 * (so the user can unhide them) and orders by each user's effective
 * sortOrder: their own override for a shared category, or its own value. */
export async function getCategoriesForManagement(userId: string): Promise<ManagedCategory[]> {
  const rows = await db.category.findMany({
    where: {
      parentId: null,
      OR: [{ userId: null }, { userId, isArchived: false }],
    },
    include: {
      children: {
        where: { OR: [{ userId: null }, { userId, isArchived: false }] },
        orderBy: { sortOrder: 'asc' },
      },
      userPrefs: { where: { userId } },
      _count: { select: { expenses: true, budgets: true, recurring: true } },
    },
  })

  return rows
    .map((c) => {
      const pref = c.userPrefs[0]
      const isOwn = c.userId === userId
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        color: c.color,
        isSystem: c.isSystem,
        isOwn,
        hidden: isOwn ? false : (pref?.hidden ?? false),
        sortOrder: isOwn ? c.sortOrder : (pref?.sortOrder ?? c.sortOrder),
        usageCount: isOwn ? c._count.expenses + c._count.budgets + c._count.recurring : 0,
        children: c.children.map((ch) => ({
          id: ch.id,
          name: ch.name,
          slug: ch.slug,
          icon: ch.icon,
          color: ch.color,
          isSystem: ch.isSystem,
        })),
      }
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
