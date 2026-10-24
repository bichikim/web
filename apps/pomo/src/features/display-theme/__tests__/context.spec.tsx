/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {DisplayThemeContext, useDisplayTheme} from '../context'
import type {DisplayThemeController} from '../model'

const controller = {
  onPreferenceChange: () => undefined,
  preference: () => 'system',
} satisfies DisplayThemeController

it('should expose the root-owned controller to descendants', () => {
  let receivedController: DisplayThemeController | undefined
  const Consumer = () => {
    receivedController = useDisplayTheme()
    return null
  }

  render(() => (
    <DisplayThemeContext.Provider value={controller}>
      <Consumer />
    </DisplayThemeContext.Provider>
  ))

  expect(receivedController).toBe(controller)
})

it('should reject consumers rendered outside the provider', () => {
  expect(() => render(() => useDisplayTheme() as never)).toThrow('DisplayThemeProvider is required')
})
