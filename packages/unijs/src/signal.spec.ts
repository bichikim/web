import {effect, effectScope, signal} from 'alien-signals'
import {describe, expect, it} from 'vitest'

describe('signal', () => {
  it('should be able to create a signal', () => {
    const a = signal(1)

    expect(a()).toBe(1)
  })
})
