'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Reorder, useDragControls } from 'framer-motion'
import { Check, ChevronRight, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react'
import { CategoryChip } from '@/components/ui/category-chip'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { categoryIcon, categoryColor, CATEGORY_ICON_KEYS, CATEGORY_COLORS, type CategoryColorToken } from '@/config/categories'
import { categoryLabel } from '@/i18n/category-label'
import { useT } from '@/i18n/provider'
import { resolveActionError } from '@/i18n/action-error'
import { feedback } from '@/lib/feedback'
import { cn } from '@/lib/utils'
import type { ManagedCategory } from '@/server/services/categories'
import { createCategory, deleteCategory, reorderCategories, toggleCategoryVisibility, updateCategory } from '@/server/services/category-actions'

type EditTarget = { mode: 'create' } | { mode: 'edit'; category: ManagedCategory } | null

export function CategoriesManager({ initialCategories }: { initialCategories: ManagedCategory[] }) {
  const t = useT()
  const router = useRouter()
  const [items, setItems] = useState(initialCategories)
  const itemsRef = useRef(items)
  const [, startTransition] = useTransition()
  const [target, setTarget] = useState<EditTarget>(null)

  function setItemsAndRef(next: ManagedCategory[]) {
    itemsRef.current = next
    setItems(next)
  }

  function persistOrder() {
    startTransition(async () => {
      const result = await reorderCategories(itemsRef.current.map((c) => c.id))
      if (!result.ok) router.refresh()
    })
  }

  function handleToggleHidden(category: ManagedCategory) {
    feedback.tap()
    const next = !category.hidden
    setItemsAndRef(items.map((c) => (c.id === category.id ? { ...c, hidden: next } : c)))
    startTransition(async () => {
      const result = await toggleCategoryVisibility(category.id, next)
      if (result.ok) feedback.selection()
      else {
        feedback.error()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <Button variant="secondary" full onClick={() => setTarget({ mode: 'create' })}>
        <Plus className="size-4.5" aria-hidden />
        {t('profile.categoriesManage.addCategory')}
      </Button>

      <p className="text-caption text-text-muted">{t('profile.categoriesManage.reorderHint')}</p>

      <Reorder.Group
        axis="y"
        values={items}
        onReorder={setItemsAndRef}
        className="space-y-2"
      >
        {items.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            onDragCommit={persistOrder}
            onToggleHidden={() => handleToggleHidden(category)}
            onOpen={() => setTarget({ mode: 'edit', category })}
          />
        ))}
      </Reorder.Group>

      <CategoryFormSheet
        target={target}
        onClose={() => setTarget(null)}
        onSaved={(saved) => {
          setTarget(null)
          if (saved.kind === 'created') {
            setItemsAndRef([
              ...items,
              {
                id: saved.category.id,
                name: saved.category.name,
                slug: saved.category.slug,
                icon: saved.category.icon,
                color: saved.category.color,
                isSystem: false,
                isOwn: true,
                hidden: false,
                sortOrder: saved.category.sortOrder,
                usageCount: 0,
                children: [],
              },
            ])
          } else if (saved.kind === 'updated') {
            setItemsAndRef(
              items.map((c) => (c.id === saved.category.id ? { ...c, ...saved.category } : c)),
            )
          } else if (saved.kind === 'deleted') {
            setItemsAndRef(saved.hardDeleted ? items.filter((c) => c.id !== saved.id) : items.map((c) => (c.id === saved.id ? { ...c, hidden: true } : c)))
          }
        }}
      />
    </div>
  )
}

function CategoryRow({
  category,
  onDragCommit,
  onToggleHidden,
  onOpen,
}: {
  category: ManagedCategory
  onDragCommit: () => void
  onToggleHidden: () => void
  onOpen: () => void
}) {
  const t = useT()
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={category}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragCommit}
      className={cn(
        'flex items-center gap-2 rounded-md border border-border-subtle bg-surface p-2.5',
        category.hidden && 'opacity-50',
      )}
    >
      <button
        type="button"
        aria-label={t('profile.categoriesManage.reorderHint')}
        onPointerDown={(e) => dragControls.start(e)}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center text-text-muted active:cursor-grabbing"
      >
        <GripVertical className="size-4.5" aria-hidden />
      </button>

      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        <CategoryChip icon={category.icon} color={category.color} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-title-card">{categoryLabel(t, category)}</span>
          <span className="block text-caption text-text-muted">
            {category.isSystem ? t('profile.categoriesManage.defaultTag') : t('profile.categoriesManage.customTag')}
            {category.children.length > 0 && ` · ${t('profile.categoriesManage.subcategoriesCount', { count: category.children.length })}`}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-text-muted rtl:rotate-180" aria-hidden />
      </button>

      <button
        type="button"
        onClick={onToggleHidden}
        aria-label={category.hidden ? t('profile.categoriesManage.show') : t('profile.categoriesManage.hide')}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-sunken"
      >
        {category.hidden ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
      </button>
    </Reorder.Item>
  )
}

type SavedResult =
  | { kind: 'created'; category: { id: string; name: string; slug: string; icon: string; color: string; sortOrder: number } }
  | { kind: 'updated'; category: Pick<ManagedCategory, 'id' | 'name' | 'icon' | 'color'> & Partial<Pick<ManagedCategory, 'hidden'>> }
  | { kind: 'deleted'; id: string; hardDeleted: boolean }

function CategoryFormSheet({
  target,
  onClose,
  onSaved,
}: {
  target: EditTarget
  onClose: () => void
  onSaved: (result: SavedResult) => void
}) {
  const t = useT()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEdit = target?.mode === 'edit'
  const editingSystem = isEdit && !target.category.isOwn

  const [name, setName] = useState(isEdit ? target.category.name : '')
  const [icon, setIcon] = useState(isEdit ? target.category.icon : 'shopping-bag')
  const [color, setColor] = useState<string>(isEdit ? target.category.color : 'primary')

  // Re-seed local form state whenever the sheet opens for a different target.
  const [openKey, setOpenKey] = useState<string | null>(null)
  const nextKey = target ? (target.mode === 'create' ? 'create' : target.category.id) : null
  if (nextKey !== openKey) {
    setOpenKey(nextKey)
    setError(null)
    if (target?.mode === 'edit') {
      setName(target.category.name)
      setIcon(target.category.icon)
      setColor(target.category.color)
    } else if (target?.mode === 'create') {
      setName('')
      setIcon('shopping-bag')
      setColor('primary')
    }
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      if (target?.mode === 'create') {
        const result = await createCategory({ name: name.trim(), icon, color })
        if (!result.ok) {
          feedback.error()
          setError(resolveActionError(t, result.errorCode))
          return
        }
        feedback.success()
        onSaved({ kind: 'created', category: result.category })
      } else if (target?.mode === 'edit' && target.category.isOwn) {
        const result = await updateCategory({ id: target.category.id, name: name.trim(), icon, color })
        if (!result.ok) {
          feedback.error()
          setError(resolveActionError(t, result.errorCode))
          return
        }
        feedback.success()
        onSaved({ kind: 'updated', category: { id: target.category.id, name: name.trim(), icon, color } })
      }
    })
  }

  function handleDelete() {
    if (target?.mode !== 'edit' || !target.category.isOwn) return
    feedback.destructive()
    startTransition(async () => {
      const result = await deleteCategory(target.category.id)
      if (!result.ok) {
        feedback.error()
        setError(resolveActionError(t, result.errorCode))
        return
      }
      feedback.success()
      onSaved({ kind: 'deleted', id: target.category.id, hardDeleted: !result.archived })
    })
  }

  function handleToggleVisibility() {
    if (target?.mode !== 'edit') return
    feedback.selection()
    startTransition(async () => {
      const result = await toggleCategoryVisibility(target.category.id, !target.category.hidden)
      if (!result.ok) {
        feedback.error()
        setError(resolveActionError(t, result.errorCode))
        return
      }
      onSaved({
        kind: 'updated',
        category: {
          id: target.category.id,
          name: target.category.name,
          icon: target.category.icon,
          color: target.category.color,
          hidden: !target.category.hidden,
        },
      })
    })
  }

  const title = target?.mode === 'create'
    ? t('profile.categoriesManage.newCategoryTitle')
    : t('profile.categoriesManage.editCategoryTitle')

  return (
    <Sheet open={target !== null} onClose={onClose} title={title}>
      {editingSystem && target?.mode === 'edit' ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <CategoryChip icon={target.category.icon} color={target.category.color} size="lg" />
            <p className="text-title-card">{categoryLabel(t, target.category)}</p>
            <p className="text-caption text-text-muted">{t('profile.categoriesManage.defaultTag')}</p>
          </div>
          <p className="text-sm font-medium text-text-muted">{t('profile.categoriesManage.showHelper')}</p>
          <div className="flex items-center justify-between rounded-md border border-border-subtle p-3.5">
            <span className="text-title-card">{t('profile.categoriesManage.showInMyCategories')}</span>
            <Switch checked={!target.category.hidden} onChange={handleToggleVisibility} label={t('profile.categoriesManage.showInMyCategories')} />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-meta">{t('profile.categoriesManage.nameLabel')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder={t('profile.categoriesManage.namePlaceholder')}
              aria-label={t('profile.categoriesManage.nameLabel')}
              className="h-12 w-full rounded-md border border-border-strong bg-surface px-4 font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-meta">{t('profile.categoriesManage.colorLabel')}</label>
            <div className="flex flex-wrap gap-2.5">
              {(Object.keys(CATEGORY_COLORS) as CategoryColorToken[]).map((token) => {
                const colors = categoryColor(token)
                const active = token === color
                return (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setColor(token)}
                    aria-label={token}
                    aria-pressed={active}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition active:scale-95',
                      colors.bg,
                      active ? 'ring-2 ring-primary' : 'ring-1 ring-border-subtle',
                    )}
                  >
                    {active && <Check className={cn('size-4', colors.fg)} aria-hidden />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-meta">{t('profile.categoriesManage.iconLabel')}</label>
            <div className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto rounded-md border border-border-subtle p-2">
              {CATEGORY_ICON_KEYS.map((key) => {
                const Icon = categoryIcon(key)
                const active = key === icon
                const colors = categoryColor(color)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    aria-label={key}
                    aria-pressed={active}
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full border transition active:scale-95',
                      active ? cn('border-primary', colors.bg, colors.fg) : 'border-transparent bg-surface-sunken text-text-secondary',
                    )}
                  >
                    <Icon className="size-4.5" aria-hidden />
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}

          <Button full size="lg" loading={pending} disabled={name.trim().length < 1} onClick={handleSave}>
            {t('common.save')}
          </Button>

          {isEdit && target.category.isOwn && (
            <div className="border-t border-border-subtle pt-4">
              <p className="mb-3 text-sm font-medium text-text-muted">
                {target.category.usageCount > 0
                  ? t('profile.categoriesManage.deleteWithHistoryWarning', { count: target.category.usageCount })
                  : t('profile.categoriesManage.deleteNoHistoryWarning')}
              </p>
              <Button variant="danger" full loading={pending} onClick={handleDelete}>
                <Trash2 className="size-4.5" aria-hidden />
                {t('profile.categoriesManage.deleteCategory')}
              </Button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
