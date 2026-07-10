// Flagship Save Expense interaction: exactly-once persistence under rapid
// double-tap, success feedback only after confirmed server persistence, and
// preserved form state + no success feedback on a failed save.
import { createElement, forwardRef } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AddExpenseSheet, type AddExpenseData } from '@/components/expenses/add-expense-sheet'
import { I18nProvider } from '@/i18n/provider'

// AnimatePresence's mode="wait" step transitions depend on framer-motion's
// exit-animation completing, which doesn't resolve reliably under jsdom's
// requestAnimationFrame timing (see the handoff's FRAGILE note on this
// file's step transitions). Stub framer-motion so this test exercises the
// actual save/guard/feedback logic instead of animation plumbing.
const MOTION_ONLY_PROPS = new Set([
  'variants', 'initial', 'animate', 'exit', 'transition', 'whileTap', 'whileHover',
  'drag', 'dragConstraints', 'dragElastic', 'onDragEnd', 'layout', 'layoutId',
])
function stripMotionProps(props: Record<string, unknown>) {
  const rest: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    if (!MOTION_ONLY_PROPS.has(key)) rest[key] = props[key]
  }
  return rest
}
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        const Tag = forwardRef((props: Record<string, unknown>, ref) => createElement(tag, { ...stripMotionProps(props), ref }))
        Tag.displayName = `motion.${tag}`
        return Tag
      },
    },
  ),
  useAnimation: () => ({ start: vi.fn() }),
  useReducedMotion: () => false,
}))

const routerRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh, push: vi.fn(), replace: vi.fn() }),
}))

const createExpense = vi.fn()
vi.mock('@/server/services/expense-actions', () => ({
  createExpense: (...args: unknown[]) => createExpense(...args),
}))

const feedbackSuccess = vi.fn()
const feedbackError = vi.fn()
const feedbackPrimeAudio = vi.fn()
vi.mock('@/lib/feedback', () => ({
  feedback: {
    success: (...args: unknown[]) => feedbackSuccess(...args),
    error: (...args: unknown[]) => feedbackError(...args),
    primeAudio: (...args: unknown[]) => feedbackPrimeAudio(...args),
  },
}))

const DATA: AddExpenseData = {
  categories: [{ id: 'cat-food', name: 'Food', slug: 'food', icon: 'utensils', color: '#000', children: [] }],
  wallets: [{ id: 'wallet-1', name: 'Cash', icon: 'wallet' }],
  currency: 'DZD',
}

function renderSheet(onClose = vi.fn()) {
  return render(
    <I18nProvider locale="en">
      <AddExpenseSheet open onClose={onClose} data={DATA} />
    </I18nProvider>,
  )
}

async function fillThroughToCategoryStep() {
  fireEvent.click(screen.getByRole('button', { name: '5' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled())
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  const description = await screen.findByLabelText('What was it?')
  fireEvent.change(description, { target: { value: 'Coffee' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  const categoryButton = await screen.findByRole('radio', { name: 'Food' })
  fireEvent.click(categoryButton)
}

describe('AddExpenseSheet — save expense flagship interaction', () => {
  beforeEach(() => {
    createExpense.mockReset()
    feedbackSuccess.mockReset()
    feedbackError.mockReset()
    feedbackPrimeAudio.mockReset()
    routerRefresh.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('persists exactly once under a rapid double-tap and fires success feedback only after confirmed persistence', async () => {
    let resolveCreate!: (v: { ok: true }) => void
    createExpense.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve }))

    renderSheet()
    await act(async () => {
      await fillThroughToCategoryStep()
    })

    const saveButton = screen.getByRole('button', { name: 'Save expense' })
    fireEvent.click(saveButton)
    fireEvent.click(saveButton)
    fireEvent.click(saveButton)

    expect(createExpense).toHaveBeenCalledTimes(1)
    expect(feedbackPrimeAudio).toHaveBeenCalledTimes(1)
    expect(feedbackSuccess).not.toHaveBeenCalled()

    await act(async () => {
      resolveCreate({ ok: true })
      await Promise.resolve()
    })

    await waitFor(() => expect(feedbackSuccess).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('shows no success feedback and preserves the form on a failed save', async () => {
    createExpense.mockResolvedValue({ ok: false, errorCode: 'save_failed' })

    renderSheet()
    await act(async () => {
      await fillThroughToCategoryStep()
    })

    const saveButton = screen.getByRole('button', { name: 'Save expense' })
    await act(async () => {
      fireEvent.click(saveButton)
      await Promise.resolve()
    })

    await waitFor(() => expect(feedbackError).toHaveBeenCalledTimes(1))
    expect(feedbackSuccess).not.toHaveBeenCalled()
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    // form state preserved — amount/description still reflected in the header row
    expect(screen.getByText(/Coffee/)).toBeInTheDocument()
  })

  it('allows retry after a failed save', async () => {
    createExpense.mockResolvedValueOnce({ ok: false, errorCode: 'save_failed' }).mockResolvedValueOnce({ ok: true })

    renderSheet()
    await act(async () => {
      await fillThroughToCategoryStep()
    })

    const saveButton = screen.getByRole('button', { name: 'Save expense' })
    fireEvent.click(saveButton)
    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1))
    await screen.findByRole('alert')
    await waitFor(() => expect(feedbackError).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))
    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(feedbackSuccess).toHaveBeenCalledTimes(1))
  })
})
