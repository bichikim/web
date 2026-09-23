/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {ModelPicker} from '../ModelPicker'

vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('../../dialogue-settings/Panel', () => ({
  PDialogueSettingsPanel: (props: {onRequestClose?: () => void}) => (
    <button onClick={() => props.onRequestClose?.()} type="button">
      dialogue settings
    </button>
  ),
}))

afterEach(() => {
  vi.clearAllMocks()
})
it('should select and disable voice models', () => {
  const onModelChange = vi.fn()
  const result = render(() => (
    <ModelPicker disabled={false} onModelChange={onModelChange} selectedModelId="full" />
  ))
  const buttons = screen.getAllByRole('button')

  expect(buttons.length).toBeGreaterThan(1)
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(buttons[1]!)
  expect(onModelChange).toHaveBeenCalledOnce()

  result.unmount()
  render(() => <ModelPicker disabled onModelChange={onModelChange} selectedModelId="full" />)
  expect(screen.getAllByRole('button').every((button) => button.hasAttribute('disabled'))).toBe(
    true,
  )
})
