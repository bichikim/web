/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PPanel} from '../PPanel'

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
it('should render panel content with default and explicit variants', () => {
  const result = render(() => <PPanel>default panel</PPanel>)

  expect(screen.getByText('default panel').className).toContain('p-3')
  result.unmount()
  render(() => (
    <PPanel class="custom-panel" padding="spacious" tone="strong">
      strong panel
    </PPanel>
  ))
  expect(screen.getByText('strong panel').className).toContain('custom-panel')
})
