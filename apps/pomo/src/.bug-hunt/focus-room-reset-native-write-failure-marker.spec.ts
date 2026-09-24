/** @vitest-environment jsdom */
import {beforeEach, expect, it} from 'vitest'

import {createRuntimeOptionResetManager} from '../features/dev-option-reset'

const SCENE_PREFERENCES_KEY = 'pomo:focus-room-scene-preferences:v1'
const NATIVE_WRITE_FAILURE_KEY = 'pomo:focus-room-scene-preferences:native-write-failure:v1'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

it('should remove the native write failure marker when focus-room options are reset', async () => {
  localStorage.setItem(
    SCENE_PREFERENCES_KEY,
    JSON.stringify({activity: 'reading', gaze: 'focused', timeMode: 'day'}),
  )
  localStorage.setItem(NATIVE_WRITE_FAILURE_KEY, 'true')

  await expect(createRuntimeOptionResetManager().reset('focus-room')).resolves.toEqual({
    status: 'complete',
  })

  expect(localStorage.getItem(SCENE_PREFERENCES_KEY)).toBeNull()
  expect(localStorage.getItem(NATIVE_WRITE_FAILURE_KEY)).toBeNull()
})
