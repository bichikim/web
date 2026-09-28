/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {createRuntimeOptionResetManager} from '../features/dev-option-reset'

const UI_AUTO_HIDE_KEY = 'pomo:ui-auto-hide:v1'
const SCREEN_SAVER_KEY = 'pomo:screen-saver-delay:v1'

it('should clear UI auto-hide preferences when focus-room options are reset', async () => {
  localStorage.setItem(
    UI_AUTO_HIDE_KEY,
    JSON.stringify({enabled: true, seconds: 300}),
  )
  localStorage.setItem(
    SCREEN_SAVER_KEY,
    JSON.stringify({delay: '1h', savedAt: 1}),
  )

  await createRuntimeOptionResetManager().reset('focus-room')

  expect(localStorage.getItem(SCREEN_SAVER_KEY)).toBeNull()
  expect(localStorage.getItem(UI_AUTO_HIDE_KEY)).toBeNull()
})
