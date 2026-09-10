/** @vitest-environment node */

import {afterEach, expect, it, vi} from 'vitest'

import {createRuntimeOptionResetManager} from '..'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should use web storage when no native bridge exists', async () => {
  const removeItem = vi.fn()
  vi.stubGlobal('localStorage', {removeItem})

  await expect(createRuntimeOptionResetManager().reset('updates')).resolves.toEqual({
    status: 'complete',
  })
  expect(removeItem).toHaveBeenCalledWith('pomo:viewed-version-release:v1')
})
