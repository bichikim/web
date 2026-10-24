/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {useDisplayTheme} from '../context'
import type {DisplayThemeController} from '../model'
import {useDisplayThemeController} from '../use-display-theme'
import {DisplayThemeProvider} from '../DisplayThemeProvider'

vi.mock('../use-display-theme', () => ({useDisplayThemeController: vi.fn()}))

it('should provide the controller that owns the document theme', () => {
  const controller = {
    onPreferenceChange: vi.fn(),
    preference: () => 'bright',
  } satisfies DisplayThemeController
  vi.mocked(useDisplayThemeController).mockReturnValue(controller)
  let receivedController: DisplayThemeController | undefined
  const Consumer = () => {
    receivedController = useDisplayTheme()
    return null
  }

  render(() => (
    <DisplayThemeProvider>
      <Consumer />
    </DisplayThemeProvider>
  ))

  expect(receivedController).toBe(controller)
})
