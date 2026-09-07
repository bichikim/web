/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PTooltipContent, PTooltipProvider} from '../../tooltip'
import {installTooltipBrowser} from '../../tooltip/__tests__/support/browser'
import {DialogueTrigger} from '../DialogueTrigger'

let browser: ReturnType<typeof installTooltipBrowser>
beforeEach(() => {
  browser = installTooltipBrowser()
})
afterEach(() => {
  cleanup()
  browser.restore()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('should provide its button ref and forward activation', () => {
  const onClick = vi.fn()
  const onMount = vi.fn()
  render(() => (
    <DialogueTrigger disabled={false} loading={false} onClick={onClick} onMount={onMount} />
  ))
  const button = screen.getByRole('button', {name: m.dialogue_composer_start_label()})
  expect(onMount.mock.calls[0]?.[0]).toBe(button)
  expect(button).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(button)
  expect(onClick).toHaveBeenCalledOnce()
})
it('should present a disabled preparation indicator', () => {
  render(() => <DialogueTrigger disabled loading onClick={vi.fn()} onMount={vi.fn()} />)
  expect(screen.getByRole('button', {name: m.dialogue_composer_preparing_label()})).toBeDisabled()
})

it('should show the conversation label on hover without reopening on pointer-originated focus', () => {
  vi.useFakeTimers()
  render(() => (
    <PTooltipProvider>
      <DialogueTrigger disabled={false} loading={false} onClick={vi.fn()} onMount={vi.fn()} />
      <PTooltipContent />
    </PTooltipProvider>
  ))
  const button = screen.getByRole('button', {name: m.dialogue_composer_start_label()})
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(400)
  expect(screen.getByRole('tooltip')).toHaveTextContent(m.dialogue_composer_start_label())
  expect(button).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id)
  fireEvent.pointerLeave(button)
  vi.advanceTimersByTime(150)
  expect(screen.queryByRole('tooltip')).toBeNull()
  button.focus()
  vi.advanceTimersByTime(400)
  expect(screen.queryByRole('tooltip')).toBeNull()
})
