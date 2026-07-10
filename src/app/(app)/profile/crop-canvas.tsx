'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useT } from '@/i18n/provider'

const EXPORT_SIZE = 512
const MIN_ZOOM = 1
const MAX_ZOOM = 3

export type CropCanvasHandle = {
  exportBlob: () => Promise<Blob | null>
}

function exportCanvas(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (webpBlob) => {
        if (webpBlob) {
          resolve(webpBlob)
          return
        }
        // Defensive fallback — canvas WebP encoding has historically had
        // gaps on some engines; JPEG is universally supported.
        canvas.toBlob((jpegBlob) => resolve(jpegBlob), 'image/jpeg', 0.92)
      },
      'image/webp',
      0.92,
    )
  })
}

/** Square crop with drag-to-pan and a zoom slider, drawn directly on the
 * canvas that gets exported — what you see is exactly what gets uploaded.
 * No cropper library: pointer events already unify mouse/touch/pen, and
 * the math is ~40 lines, well under the bar for pulling in a dependency. */
export const CropCanvas = forwardRef<CropCanvasHandle, { file: File }>(function CropCanvas({ file }, ref) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const draggingRef = useRef<{ startX: number; startY: number; startPos: { x: number; y: number } } | null>(null)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  // pos = top-left draw coordinates of the scaled image on the EXPORT_SIZE canvas
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useImperativeHandle(ref, () => ({
    exportBlob: async () => {
      const canvas = canvasRef.current
      if (!canvas) return null
      return exportCanvas(canvas)
    },
  }))

  // Load the selected file into an offscreen <img> once.
  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setZoom(1)
      setReady(true)
    }
    img.src = url
    return () => {
      URL.revokeObjectURL(url)
      imgRef.current = null
      setReady(false)
    }
  }, [file])

  function clamp(nextPos: { x: number; y: number }, z: number) {
    const img = imgRef.current
    if (!img) return nextPos
    const baseScale = Math.max(EXPORT_SIZE / img.naturalWidth, EXPORT_SIZE / img.naturalHeight)
    const s = baseScale * z
    const w = img.naturalWidth * s
    const h = img.naturalHeight * s
    return {
      x: Math.min(0, Math.max(EXPORT_SIZE - w, nextPos.x)),
      y: Math.min(0, Math.max(EXPORT_SIZE - h, nextPos.y)),
    }
  }

  function recenter(z: number) {
    const img = imgRef.current
    if (!img) return
    const baseScale = Math.max(EXPORT_SIZE / img.naturalWidth, EXPORT_SIZE / img.naturalHeight)
    const s = baseScale * z
    const w = img.naturalWidth * s
    const h = img.naturalHeight * s
    setPos(clamp({ x: (EXPORT_SIZE - w) / 2, y: (EXPORT_SIZE - h) / 2 }, z))
  }

  // (Re)draw whenever the loaded image, zoom, or pan position changes.
  useEffect(() => {
    if (!ready) return
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const baseScale = Math.max(EXPORT_SIZE / img.naturalWidth, EXPORT_SIZE / img.naturalHeight)
    const s = baseScale * zoom
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE)
    ctx.drawImage(img, pos.x, pos.y, img.naturalWidth * s, img.naturalHeight * s)
  }, [ready, zoom, pos])

  useEffect(() => {
    if (ready) recenter(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-center on a fresh image load, not on every zoom/pos change
  }, [ready])

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = { startX: e.clientX, startY: e.clientY, startPos: pos }
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = draggingRef.current
    if (!drag) return
    const displayToExport = EXPORT_SIZE / e.currentTarget.clientWidth
    const dx = (e.clientX - drag.startX) * displayToExport
    const dy = (e.clientY - drag.startY) * displayToExport
    setPos(clamp({ x: drag.startPos.x + dx, y: drag.startPos.y + dy }, zoom))
  }
  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    draggingRef.current = null
  }

  function onZoomChange(next: number) {
    setZoom(next)
    setPos((p) => clamp(p, next))
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-64 overflow-hidden rounded-full bg-surface-sunken shadow-raised">
        <canvas
          ref={canvasRef}
          width={EXPORT_SIZE}
          height={EXPORT_SIZE}
          role="img"
          aria-label={t('profile.avatar.cropAria')}
          className="size-full touch-none select-none"
          style={{ cursor: ready ? 'grab' : 'default' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <label className="flex w-full max-w-xs items-center gap-3">
        <span className="size-1.5 shrink-0 rounded-full bg-text-muted" aria-hidden />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          disabled={!ready}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          aria-label={t('profile.avatar.zoomLabel')}
          className="h-2 w-full accent-primary"
        />
        <span className="size-3 shrink-0 rounded-full bg-text-muted" aria-hidden />
      </label>
      <p className="text-center text-xs font-medium text-text-muted">{t('profile.avatar.cropHelper')}</p>
    </div>
  )
})
