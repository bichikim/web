/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {AuthSubmitButton} from '../AuthSubmitButton'
import {AuthSurface} from '../AuthSurface'
import {AuthTextField} from '../AuthTextField'

describe('auth components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the surface content and optional footer', () => {
    render(() => (
      <AuthSurface title="Account" titleClass="danger" footer={<a href="/">Back</a>}>
        <p>Form content</p>
      </AuthSurface>
    ))

    expect(screen.getByRole('heading', {name: 'Account'})).toHaveClass('danger')
    expect(screen.getByText('Form content')).toBeInTheDocument()
    expect(screen.getByRole('link', {name: 'Back'})).toHaveAttribute('href', '/')
  })

  it('should forward text field input and accessibility attributes', async () => {
    const onChange = vi.fn()

    render(() => (
      <AuthTextField
        id="email"
        label="Email"
        value=""
        type="email"
        autocomplete="email"
        minLength={3}
        placeholder="name@example.com"
        required
        onChange={onChange}
        trailing={<span>suffix</span>}
      />
    ))

    const input = screen.getByRole('textbox', {name: 'Email'})
    fireEvent.input(input, {target: {value: 'a@b.co'}})

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('a@b.co'))
    expect(input).toHaveAttribute('autocomplete', 'email')
    expect(input).toHaveAttribute('minlength', '3')
    expect(input).toBeRequired()
    expect(screen.getByText('suffix')).toBeInTheDocument()
  })

  it('should render a disabled submit button', () => {
    render(() => <AuthSubmitButton disabled>Save</AuthSubmitButton>)

    expect(screen.getByRole('button', {name: 'Save'})).toBeDisabled()
    expect(screen.getByRole('button', {name: 'Save'})).toHaveAttribute('type', 'submit')
  })
})
