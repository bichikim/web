/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {OPTION_RESET_GROUPS} from 'src/features/dev-option-reset'
import {afterEach, expect, it, vi} from 'vitest'
import {OptionGroupCard} from '../OptionGroupCard'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should pass the reset group and trigger element and disable busy actions', () => {
  const group = OPTION_RESET_GROUPS[0]!
  const onReset = vi.fn()
  const [busy, setBusy] = createSignal(false)
  render(() => <OptionGroupCard busy={busy()} group={group} onReset={onReset} />)
  expect(screen.getByRole('heading')).toHaveTextContent(group.label)
  const button = screen.getByRole('button')
  fireEvent.click(button)
  expect(onReset).toHaveBeenCalledWith(group, button)
  setBusy(true)
  expect(button).toBeDisabled()
})
