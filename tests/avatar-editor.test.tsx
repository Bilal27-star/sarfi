// AvatarEditor orchestration: client-side pre-validation, choose -> crop ->
// save flow, cancel discards without side effects, remove requires a
// confirmation step, and errors keep the user's crop instead of losing it.
import { createElement, forwardRef, useImperativeHandle } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/provider'

const routerRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: routerRefresh, push: vi.fn(), replace: vi.fn() }) }))

const uploadAvatarMock = vi.fn()
const removeAvatarMock = vi.fn()
vi.mock('@/server/services/avatar-actions', () => ({
  uploadAvatar: (...args: unknown[]) => uploadAvatarMock(...args),
  removeAvatar: (...args: unknown[]) => removeAvatarMock(...args),
}))

const feedbackSuccess = vi.fn()
const feedbackError = vi.fn()
vi.mock('@/lib/feedback', () => ({ feedback: { success: (...a: unknown[]) => feedbackSuccess(...a), error: (...a: unknown[]) => feedbackError(...a) } }))

const exportBlobMock = vi.fn()
vi.mock('@/app/(app)/profile/crop-canvas', () => {
  const MockCropCanvas = forwardRef((_props: { file: File }, ref) => {
    useImperativeHandle(ref, () => ({ exportBlob: exportBlobMock }))
    return createElement('div', { 'data-testid': 'crop-canvas' })
  })
  MockCropCanvas.displayName = 'MockCropCanvas'
  return { CropCanvas: MockCropCanvas }
})

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy(
    {},
    {
      get: (_t, tag: string) => {
        const Tag = forwardRef((props: Record<string, unknown>, ref) =>
          createElement(tag, { ...props, ref, variants: undefined, initial: undefined, animate: undefined, exit: undefined, transition: undefined }),
        )
        Tag.displayName = `motion.${tag}`
        return Tag
      },
    },
  ),
  useReducedMotion: () => false,
}))

import { AvatarEditor } from '@/app/(app)/profile/avatar-editor'

function renderEditor(avatarUrl: string | null = null) {
  return render(
    <I18nProvider locale="en">
      <AvatarEditor name="Bilal" avatarUrl={avatarUrl} />
    </I18nProvider>,
  )
}

function pngFile(name = 'photo.png') {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' })
}

describe('AvatarEditor', () => {
  beforeEach(() => {
    routerRefresh.mockClear()
    uploadAvatarMock.mockReset().mockResolvedValue({ ok: true })
    removeAvatarMock.mockReset().mockResolvedValue({ ok: true })
    feedbackSuccess.mockClear()
    feedbackError.mockClear()
    exportBlobMock.mockReset().mockResolvedValue(new Blob(['x'], { type: 'image/webp' }))
  })

  it('opens to the choose-photo view with no remove option when there is no avatar yet', () => {
    renderEditor(null)
    fireEvent.click(screen.getByRole('button', { name: 'Manage profile photo' }))
    expect(screen.getByRole('button', { name: 'Choose photo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument()
  })

  it('offers Replace and Remove when an avatar already exists', () => {
    renderEditor('https://blob.example/a.webp')
    fireEvent.click(screen.getByRole('button', { name: 'Manage profile photo' }))
    expect(screen.getByRole('button', { name: 'Replace photo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove photo' })).toBeInTheDocument()
  })

  it('rejects a disallowed file type client-side before ever entering crop mode', () => {
    renderEditor(null)
    fireEvent.click(screen.getByRole('button', { name: 'Manage profile photo' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const badFile = new File(['x'], 'a.gif', { type: 'image/gif' })
    fireEvent.change(input, { target: { files: [badFile] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Please choose a JPEG, PNG, or WebP image.')
    expect(screen.queryByTestId('crop-canvas')).not.toBeInTheDocument()
  })

  it('rejects an oversized file client-side', () => {
    renderEditor(null)
    fireEvent.click(screen.getByRole('button', { name: 'Manage profile photo' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const big = new File([new Uint8Array(1)], 'a.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 25 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [big] } })
    expect(screen.getByRole('alert')).toHaveTextContent('too large')
  })

  it('enters crop mode on a valid file, and Cancel returns to view without uploading', () => {
    renderEditor(null)
    fireEvent.click(screen.getByRole('button', { name: 'Manage profile photo' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [pngFile()] } })
    expect(screen.getByTestId('crop-canvas')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Choose photo' })).toBeInTheDocument()
    expect(uploadAvatarMock).not.toHaveBeenCalled()
  })

  it('uploads the exported crop on Save and refreshes on success', async () => {
    renderEditor(null)
    fireEvent.click(screen.getByRole('button', { name: 'Manage profile photo' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [pngFile()] } })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalledTimes(1))
    const formData = uploadAvatarMock.mock.calls[0][0] as FormData
    expect(formData.get('avatar')).toBeInstanceOf(Blob)
    await waitFor(() => expect(feedbackSuccess).toHaveBeenCalledTimes(1))
    expect(routerRefresh).toHaveBeenCalledTimes(1)
  })

  it('keeps the crop UI open and shows the error on a failed upload — no data loss', async () => {
    uploadAvatarMock.mockResolvedValue({ ok: false, errorCode: 'avatar_invalid_type' })
    renderEditor(null)
    fireEvent.click(screen.getByRole('button', { name: 'Manage profile photo' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [pngFile()] } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByTestId('crop-canvas')).toBeInTheDocument()
    expect(feedbackError).toHaveBeenCalledTimes(1)
    expect(routerRefresh).not.toHaveBeenCalled()
  })

  it('requires a confirmation step before removing, and does nothing on Cancel', () => {
    renderEditor('https://blob.example/a.webp')
    fireEvent.click(screen.getByRole('button', { name: 'Manage profile photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(screen.getByText('Remove profile photo?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(removeAvatarMock).not.toHaveBeenCalled()
  })

  it('removes the avatar after confirming', async () => {
    renderEditor('https://blob.example/a.webp')
    fireEvent.click(screen.getByRole('button', { name: 'Manage profile photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }))
    const confirmButtons = screen.getAllByRole('button', { name: 'Remove photo' })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => expect(removeAvatarMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(feedbackSuccess).toHaveBeenCalledTimes(1))
    expect(routerRefresh).toHaveBeenCalledTimes(1)
  })
})
