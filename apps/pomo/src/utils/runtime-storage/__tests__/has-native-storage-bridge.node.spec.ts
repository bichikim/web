/** @vitest-environment node */

import {describe, expect, it} from 'vitest'
import {hasNativeStorageBridge} from '../has-native-storage-bridge'

describe('hasNativeStorageBridge (node)', () => {
  it('should report no native bridge when window is absent', () => {
    expect('window' in globalThis).toBe(false)
    expect(hasNativeStorageBridge()).toBe(false)
  })
})
