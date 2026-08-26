/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {PDesktopInteractionControl} from '../PDesktopInteractionControl'

it('should toggle between interactive and click-through background input', async () => {
  const onInteractionChange = vi.fn().mockResolvedValue(undefined)
  const view = render(() => (
    <PDesktopInteractionControl
      interaction="passThrough"
      onInteractionChange={onInteractionChange}
    />
  ))

  const button = screen.getByRole('button', {name: '배경 조작 켜기'})
  expect(button).toHaveAttribute('aria-pressed', 'false')
  await fireEvent.click(button)
  expect(onInteractionChange).toHaveBeenCalledWith('interactive')

  view.unmount()
  render(() => (
    <PDesktopInteractionControl
      interaction="interactive"
      onInteractionChange={onInteractionChange}
    />
  ))
  await fireEvent.click(screen.getByRole('button', {name: '배경 조작 끄기'}))
  expect(onInteractionChange).toHaveBeenLastCalledWith('passThrough')
})

it('should expose transition errors and disable concurrent input', () => {
  render(() => (
    <PDesktopInteractionControl
      error="native failed"
      interaction="passThrough"
      isChanging
      onInteractionChange={vi.fn()}
    />
  ))

  expect(screen.getByRole('button')).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('native failed')
})
