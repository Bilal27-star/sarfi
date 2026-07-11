'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Reorder, useDragControls } from 'framer-motion'
import { ArchiveRestore, Banknote, Check, CreditCard, GripVertical, Landmark, Plus, Trash2, Wallet as WalletIcon } from 'lucide-react'
import { CategoryChip } from '@/components/ui/category-chip'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { categoryIcon, categoryColor, CATEGORY_ICON_KEYS, CATEGORY_COLORS, type CategoryColorToken } from '@/config/categories'
import { useT } from '@/i18n/provider'
import { resolveActionError } from '@/i18n/action-error'
import { feedback } from '@/lib/feedback'
import { cn } from '@/lib/utils'
import type { ManagedWallet } from '@/server/services/wallets'
import { createWallet, deleteWallet, reorderWallets, restoreWallet, updateWallet } from '@/server/services/wallet-actions'

type WalletType = ManagedWallet['type']

const TYPE_ICONS: Record<WalletType, typeof Banknote> = {
  CASH: Banknote,
  CARD: CreditCard,
  BANK: Landmark,
  OTHER: WalletIcon,
}

const TYPE_DEFAULT_ICON: Record<WalletType, string> = {
  CASH: 'banknote',
  CARD: 'credit-card',
  BANK: 'landmark',
  OTHER: 'wallet',
}

type EditTarget = { mode: 'create' } | { mode: 'edit'; wallet: ManagedWallet } | null

export function WalletsManager({
  initialWallets,
  initialArchivedWallets,
}: {
  initialWallets: ManagedWallet[]
  initialArchivedWallets: ManagedWallet[]
}) {
  const t = useT()
  const router = useRouter()
  const [items, setItems] = useState(initialWallets)
  const [archived, setArchived] = useState(initialArchivedWallets)
  const itemsRef = useRef(items)
  const [, startTransition] = useTransition()
  const [target, setTarget] = useState<EditTarget>(null)

  function setItemsAndRef(next: ManagedWallet[]) {
    itemsRef.current = next
    setItems(next)
  }

  function persistOrder() {
    startTransition(async () => {
      const result = await reorderWallets(itemsRef.current.map((w) => w.id))
      if (!result.ok) router.refresh()
    })
  }

  function handleRestore(wallet: ManagedWallet) {
    feedback.selection()
    setArchived(archived.filter((w) => w.id !== wallet.id))
    setItemsAndRef([...items, wallet])
    startTransition(async () => {
      const result = await restoreWallet(wallet.id)
      if (!result.ok) {
        feedback.error()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <Button variant="secondary" full onClick={() => setTarget({ mode: 'create' })}>
        <Plus className="size-4.5" aria-hidden />
        {t('profile.walletsManage.addWallet')}
      </Button>

      {items.length > 1 && <p className="text-caption text-text-muted">{t('profile.walletsManage.reorderHint')}</p>}

      <Reorder.Group axis="y" values={items} onReorder={setItemsAndRef} className="space-y-2">
        {items.map((wallet) => (
          <WalletRow
            key={wallet.id}
            wallet={wallet}
            onDragCommit={persistOrder}
            onOpen={() => setTarget({ mode: 'edit', wallet })}
          />
        ))}
      </Reorder.Group>

      {items.length === 0 && <p className="py-6 text-center text-sm text-text-muted">{t('profile.walletsManage.empty')}</p>}

      {archived.length > 0 && (
        <div className="space-y-2 pt-2">
          <h2 className="text-caption text-text-muted">{t('profile.walletsManage.archivedSection')}</h2>
          <div className="space-y-2">
            {archived.map((wallet) => (
              <div key={wallet.id} className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface p-2.5 opacity-60">
                <CategoryChip icon={wallet.icon} color={wallet.color} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-title-card">{wallet.name}</span>
                  <span className="block text-caption text-text-muted">{t('profile.walletsManage.archivedTag')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRestore(wallet)}
                  aria-label={t('profile.walletsManage.restore')}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-sunken"
                >
                  <ArchiveRestore className="size-4.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <WalletFormSheet
        target={target}
        onClose={() => setTarget(null)}
        onSaved={(saved) => {
          setTarget(null)
          if (saved.kind === 'created') {
            setItemsAndRef([
              ...items,
              { id: saved.wallet.id, name: saved.wallet.name, type: saved.wallet.type, icon: saved.wallet.icon, color: saved.wallet.color, sortOrder: saved.wallet.sortOrder, usageCount: 0 },
            ])
          } else if (saved.kind === 'updated') {
            setItemsAndRef(items.map((w) => (w.id === saved.wallet.id ? { ...w, ...saved.wallet } : w)))
          } else if (saved.kind === 'deleted') {
            const deletedWallet = items.find((w) => w.id === saved.id)
            setItemsAndRef(items.filter((w) => w.id !== saved.id))
            if (!saved.hardDeleted && deletedWallet) setArchived([...archived, deletedWallet])
          }
        }}
      />
    </div>
  )
}

function WalletRow({
  wallet,
  onDragCommit,
  onOpen,
}: {
  wallet: ManagedWallet
  onDragCommit: () => void
  onOpen: () => void
}) {
  const t = useT()
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={wallet}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragCommit}
      className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface p-2.5"
    >
      <button
        type="button"
        aria-label={t('profile.walletsManage.reorderHint')}
        onPointerDown={(e) => dragControls.start(e)}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center text-text-muted active:cursor-grabbing"
      >
        <GripVertical className="size-4.5" aria-hidden />
      </button>

      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        <CategoryChip icon={wallet.icon} color={wallet.color} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-title-card">{wallet.name}</span>
          <span className="block text-caption text-text-muted">{t(`profile.walletsManage.type${wallet.type}`)}</span>
        </span>
      </button>
    </Reorder.Item>
  )
}

type SavedResult =
  | { kind: 'created'; wallet: { id: string; name: string; type: WalletType; icon: string; color: string; sortOrder: number } }
  | { kind: 'updated'; wallet: Pick<ManagedWallet, 'id' | 'name' | 'type' | 'icon' | 'color'> }
  | { kind: 'deleted'; id: string; hardDeleted: boolean }

function WalletFormSheet({
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

  const [name, setName] = useState(isEdit ? target.wallet.name : '')
  const [type, setType] = useState<WalletType>(isEdit ? target.wallet.type : 'CASH')
  const [icon, setIcon] = useState(isEdit ? target.wallet.icon : TYPE_DEFAULT_ICON.CASH)
  const [color, setColor] = useState<string>(isEdit ? target.wallet.color : 'primary')

  const [openKey, setOpenKey] = useState<string | null>(null)
  const nextKey = target ? (target.mode === 'create' ? 'create' : target.wallet.id) : null
  if (nextKey !== openKey) {
    setOpenKey(nextKey)
    setError(null)
    if (target?.mode === 'edit') {
      setName(target.wallet.name)
      setType(target.wallet.type)
      setIcon(target.wallet.icon)
      setColor(target.wallet.color)
    } else if (target?.mode === 'create') {
      setName('')
      setType('CASH')
      setIcon(TYPE_DEFAULT_ICON.CASH)
      setColor('primary')
    }
  }

  function handleTypeChange(next: WalletType) {
    setType(next)
    // Only follow the type's suggested icon if the user hasn't picked a
    // custom one — once they've overridden it, respect their choice.
    const suggested = Object.values(TYPE_DEFAULT_ICON) as string[]
    if (suggested.includes(icon)) setIcon(TYPE_DEFAULT_ICON[next])
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      if (target?.mode === 'create') {
        const result = await createWallet({ name: name.trim(), type, icon, color })
        if (!result.ok) {
          feedback.error()
          setError(resolveActionError(t, result.errorCode))
          return
        }
        feedback.success()
        onSaved({ kind: 'created', wallet: result.wallet })
      } else if (target?.mode === 'edit') {
        const result = await updateWallet({ id: target.wallet.id, name: name.trim(), type, icon, color })
        if (!result.ok) {
          feedback.error()
          setError(resolveActionError(t, result.errorCode))
          return
        }
        feedback.success()
        onSaved({ kind: 'updated', wallet: { id: target.wallet.id, name: name.trim(), type, icon, color } })
      }
    })
  }

  function handleDelete() {
    if (target?.mode !== 'edit') return
    feedback.destructive()
    startTransition(async () => {
      const result = await deleteWallet(target.wallet.id)
      if (!result.ok) {
        feedback.error()
        setError(resolveActionError(t, result.errorCode))
        return
      }
      feedback.success()
      onSaved({ kind: 'deleted', id: target.wallet.id, hardDeleted: !result.archived })
    })
  }

  const title = target?.mode === 'create' ? t('profile.walletsManage.newWalletTitle') : t('profile.walletsManage.editWalletTitle')

  return (
    <Sheet open={target !== null} onClose={onClose} title={title}>
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-meta">{t('profile.walletsManage.nameLabel')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder={t('profile.walletsManage.namePlaceholder')}
            aria-label={t('profile.walletsManage.nameLabel')}
            className="h-12 w-full rounded-md border border-border-strong bg-surface px-4 font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-meta">{t('profile.walletsManage.typeLabel')}</label>
          <div className="grid grid-cols-4 gap-2">
            {(['CASH', 'CARD', 'BANK', 'OTHER'] as WalletType[]).map((opt) => {
              const Icon = TYPE_ICONS[opt]
              const active = opt === type
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleTypeChange(opt)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md border p-2.5 text-center transition active:scale-95',
                    active ? 'border-primary bg-primary-soft' : 'border-border-subtle bg-surface',
                  )}
                >
                  <Icon className="size-4.5" aria-hidden />
                  <span className="text-[11px] font-semibold leading-tight">{t(`profile.walletsManage.type${opt}`)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-meta">{t('profile.categoriesManage.colorLabel')}</label>
          <div className="flex flex-wrap gap-2.5">
            {(Object.keys(CATEGORY_COLORS) as CategoryColorToken[]).map((tk) => {
              const colors = categoryColor(tk)
              const active = tk === color
              return (
                <button
                  key={tk}
                  type="button"
                  onClick={() => setColor(tk)}
                  aria-label={tk}
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

        {isEdit && (
          <div className="border-t border-border-subtle pt-4">
            <p className="mb-3 text-sm font-medium text-text-muted">
              {target.wallet.usageCount > 0
                ? t('profile.walletsManage.deleteWithHistoryWarning', { count: target.wallet.usageCount })
                : t('profile.walletsManage.deleteNoHistoryWarning')}
            </p>
            <Button variant="danger" full loading={pending} onClick={handleDelete}>
              <Trash2 className="size-4.5" aria-hidden />
              {t('profile.walletsManage.deleteWallet')}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
