/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PDialogueSettings} from '../PDialogueSettings'

vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('../dialogue-settings/Panel', () => ({
  PDialogueSettingsPanel: (props: {onRequestClose?: () => void}) => (
    <button onClick={() => props.onRequestClose?.()} type="button">
      dialogue settings
    </button>
  ),
}))

afterEach(() => {
  vi.clearAllMocks()
})
it('should forward dialogue settings close requests', () => {
  const onRequestClose = vi.fn()
  const result = render(() => <PDialogueSettings onRequestClose={onRequestClose} />)

  fireEvent.click(screen.getByRole('button', {name: 'dialogue settings'}))
  expect(onRequestClose).toHaveBeenCalledOnce()

  result.unmount()
  render(() => <PDialogueSettings />)
  fireEvent.click(screen.getByRole('button', {name: 'dialogue settings'}))
})
