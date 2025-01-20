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
  it('should get changed count', () => {
    const trigger = createTrigger()
    const callback = vi.fn()

    expect(trigger.changed).toBe(0)
    trigger.target = callback
    expect(trigger.changed).toBe(1)
    trigger.target = callback
    expect(trigger.changed).toBe(2)
  })
  it('should get target', () => {
    const trigger = createTrigger()
    const callback = vi.fn()

    expect(trigger.target).toBeUndefined()
    trigger.target = callback
    expect(trigger.target).toBe(callback)
  })
})
