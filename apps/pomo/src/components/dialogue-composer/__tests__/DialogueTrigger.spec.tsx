/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {DialogueTrigger} from '../DialogueTrigger'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
