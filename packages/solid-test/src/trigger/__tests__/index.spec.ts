import {describe, expect, it, vi} from 'vitest'
import {createTrigger} from '../'

describe('trigger', () => {
  it('should be created', () => {
    const trigger = createTrigger()
    expect(trigger).toBeDefined()
  })
  it('should set target and run it', () => {
    const trigger = createTrigger()
    const callback = vi.fn()

    trigger.target = callback
    trigger.run()
    expect(callback).toHaveBeenCalled()
  })
})
