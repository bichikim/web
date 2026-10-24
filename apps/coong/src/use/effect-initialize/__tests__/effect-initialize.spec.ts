/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {renderHook} from '@solidjs/testing-library'
import {createEffectInitialize} from '../index'

describe('createEffectInitialize', () => {
  it('should call effect with true on first execution', () => {
    const effect = vi.fn()

    const {cleanup} = renderHook(() => {
      createEffectInitialize(effect)
    })

    expect(effect).toHaveBeenCalledTimes(1)
    expect(effect).toHaveBeenCalledWith(true)
    cleanup()
  })

  it('should call effect with false on subsequent executions', () => {
    const effect = vi.fn()
    const [trigger, setTrigger] = createSignal(0)

    const {cleanup} = renderHook(() => {
      createEffectInitialize((isInitial) => {
        effect(isInitial)
        // Access trigger to create dependency
        trigger()
      })
    })

    expect(effect).toHaveBeenCalledTimes(1)
    expect(effect).toHaveBeenCalledWith(true)
    // Trigger re-execution
    setTrigger(1)
    expect(effect).toHaveBeenCalledTimes(2)
    expect(effect).toHaveBeenNthCalledWith(2, false)
    // Trigger another re-execution
    setTrigger(2)
    expect(effect).toHaveBeenCalledTimes(3)
    expect(effect).toHaveBeenNthCalledWith(3, false)
    cleanup()
  })

  it('should only pass true once, even with multiple re-executions', () => {
    const effect = vi.fn()
    const [trigger, setTrigger] = createSignal(0)

    const {cleanup} = renderHook(() => {
      createEffectInitialize((isInitial) => {
        effect(isInitial)
        trigger()
      })
    })

    // First execution
    expect(effect).toHaveBeenCalledWith(true)
    // Multiple re-executions
    setTrigger(1)
    setTrigger(2)
    setTrigger(3)
    // Should have been called 4 times total (1 initial + 3 re-executions)
    expect(effect).toHaveBeenCalledTimes(4)
    // Only first call should have true
    expect(effect).toHaveBeenNthCalledWith(1, true)
    expect(effect).toHaveBeenNthCalledWith(2, false)
    expect(effect).toHaveBeenNthCalledWith(3, false)
    expect(effect).toHaveBeenNthCalledWith(4, false)
    cleanup()
  })
})
