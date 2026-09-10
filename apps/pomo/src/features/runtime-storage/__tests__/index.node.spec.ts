/** @vitest-environment node */

import {expect, it} from 'vitest'
import {hasNativeStorageBridge} from '..'

it('should report no native bridge when window is absent', () => {
  expect('window' in globalThis).toBe(false)
  expect(hasNativeStorageBridge()).toBe(false)
})
