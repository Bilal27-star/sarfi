'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { CropCanvas, type CropCanvasHandle } from './crop-canvas'
import { uploadAvatar, removeAvatar } from '@/server/services/avatar-actions'
import { feedback } from '@/lib/feedback'
import { useT } from '@/i18n/provider'
import { resolveActionError } from '@/i18n/action-error'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_CLIENT_BYTES = 20 * 1024 * 1024

type Mode = 'view' | 'crop'

export function AvatarEditor({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('view')
  const [file, setFile] = useState<File | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const [removing, startRemoving] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropRef = useRef<CropCanvasHandle>(null)

  function reset() {
    setMode('view')
    setFile(null)
    setError(null)
    setConfirmRemove(false)
  }

  function close() {
    if (saving) return
    setOpen(false)
    reset()
  }

  function onFilePicked(picked: File | null) {
    if (!picked) return
    if (!ACCEPTED_TYPES.includes(picked.type)) {
      setError(t('profile.avatar.errorInvalidType'))
      return
    }
    if (picked.size > MAX_CLIENT_BYTES) {
      setError(t('profile.avatar.errorTooLarge'))
      return
    }
    setError(null)
    setFile(picked)
    setMode('crop')
  }

  function save() {
    const canvas = cropRef.current
    if (!canvas || saving) return
    setError(null)
    startSaving(async () => {
      const blob = await canvas.exportBlob()
      if (!blob) {
        setError(t('profile.avatar.errorProcessing'))
        return
      }
      const formData = new FormData()
      formData.set('avatar', blob, 'avatar.webp')
      const result = await uploadAvatar(formData)
      if (!result.ok) {
        setError(resolveActionError(t, result.errorCode))
        feedback.error()
        return
      }
      feedback.success()
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  function confirmedRemove() {
    startRemoving(async () => {
      const result = await removeAvatar()
      if (!result.ok) {
        setError(resolveActionError(t, result.errorCode))
        feedback.error()
        setConfirmRemove(false)
        return
      }
      feedback.success()
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('profile.avatar.manage')}
        className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        <Avatar name={name} avatarUrl={avatarUrl} size="lg" />
        <span className="absolute -bottom-0.5 -end-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-text-on-primary ring-2 ring-surface">
          <Camera className="size-3" aria-hidden />
        </span>
      </button>

      <Sheet open={open} onClose={close} title={mode === 'crop' ? t('profile.avatar.cropTitle') : t('profile.avatar.manage')}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          onChange={(e) => {
            onFilePicked(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />

        {error && (
          <p role="alert" className="mb-3 rounded-sm bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        {mode === 'view' && (
          <div className="flex flex-col items-center gap-5 py-2">
            <Avatar name={name} avatarUrl={avatarUrl} size="lg" className="size-28 text-3xl" />
            <div className="w-full space-y-2.5">
              <Button full size="lg" onClick={() => fileInputRef.current?.click()}>
                {avatarUrl ? t('profile.avatar.replace') : t('profile.avatar.choose')}
              </Button>
              {avatarUrl && (
                <Button full variant="secondary" className="text-danger" onClick={() => setConfirmRemove(true)}>
                  <Trash2 className="size-4" aria-hidden />
                  {t('profile.avatar.remove')}
                </Button>
              )}
            </div>
          </div>
        )}

        {mode === 'crop' && file && (
          <div className="flex flex-col gap-4 py-1">
            <CropCanvas ref={cropRef} file={file} />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={reset} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={save} loading={saving}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={confirmRemove} onClose={() => setConfirmRemove(false)} title={t('profile.avatar.removeConfirmTitle')}>
        <p className="text-text-secondary">{t('profile.avatar.removeConfirmMessage')}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setConfirmRemove(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmedRemove} loading={removing}>
            {t('profile.avatar.remove')}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
