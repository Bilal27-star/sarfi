// Component-testing foundation — exercises the accessible error contract of <Input>.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '@/components/ui/input'
import { I18nProvider } from '@/i18n/provider'

function renderWithI18n(children: React.ReactElement) {
  return render(<I18nProvider locale="en">{children}</I18nProvider>)
}

describe('<Input />', () => {
  it('associates label and input', () => {
    renderWithI18n(<Input label="Email" name="email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('announces errors via role=alert and aria-invalid', () => {
    renderWithI18n(<Input label="Email" name="email" error="Enter a valid email address" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address')
  })

  it('toggles password visibility', () => {
    renderWithI18n(<Input label="Password" name="password" type="password" />)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    screen.getByRole('button', { name: 'Show password' }).click()
  })
})
