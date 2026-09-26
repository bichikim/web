/** @vitest-environment jsdom */

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {render, screen} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PUiAutoHideSettings} from '../UiAutoHide'

vi.mock('../../../p-select/PSelect', () => ({
  PSelect: (props: {label: string; options: ReadonlyArray<{label: string}>}) => (
    <div>
      <span>{props.label}</span>
      <For each={props.options}>{(option) => <span>{option.label}</span>}</For>
    </div>
  ),
}))
vi.mock('../../../p-switch/PSwitch', () => ({
  PSwitch: (props: {description: string; label: string}) => (
    <div>
      <span>{props.label}</span>
      <span>{props.description}</span>
    </div>
  ),
}))

const originalGetLocale = getLocale

beforeEach(() => {
  overwriteGetLocale(() => 'en')
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
  vi.clearAllMocks()
})

it('should render auto-hide settings in English', () => {
  render(() => (
    <PUiAutoHideSettings
      controller={{
        enabled: () => true,
        hidden: () => false,
        onEnabledChange: vi.fn(),
        onSecondsChange: vi.fn(),
        seconds: () => 30,
      }}
    />
  ))

  expect(screen.getByText('Auto-hide UI')).toBeInTheDocument()
  expect(
    screen.getByText(
      'Leave only the background when inactive. Move the pointer or touch the screen to show the UI again.',
    ),
  ).toBeInTheDocument()
  expect(screen.getByText('Hide after')).toBeInTheDocument()
  expect(screen.getByText('30 seconds')).toBeInTheDocument()
  expect(screen.queryByText(/초|분/u)).toBeNull()
})
