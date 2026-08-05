import {batch, createRoot, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {createPreviousValue} from './index'

const setupPreviousValue = <T>(value: T | (() => T)) => {
  let dispose: () => void = () => undefined
  const previousValue = createRoot((rootDispose) => {
    dispose = rootDispose
    return createPreviousValue(value)
  })

  return {dispose, previousValue}
}

describe('createPreviousValue', () => {
  it('should return undefined on first call', () => {
    const value = 1
    const {dispose, previousValue} = setupPreviousValue(value)
    expect(previousValue()).toBe(undefined)
    dispose()
  })

  it('should return the previous value on subsequent calls', () => {
    const [value, setValue] = createSignal(1)
    const {dispose, previousValue} = setupPreviousValue(value)
    expect(previousValue()).toBe(undefined)
    setValue(2)
    expect(previousValue()).toBe(1)
    dispose()
  })

  it('should return the value before the latest update after multiple changes', () => {
    const [value, setValue] = createSignal(1)
    const {dispose, previousValue} = setupPreviousValue(value)

    expect(previousValue()).toBeUndefined()
    setValue(2)
    expect(previousValue()).toBe(1)
    setValue(3)
    expect(previousValue()).toBe(2)
    dispose()
  })

  it('should skip intermediate values when updates are batched', () => {
    const [value, setValue] = createSignal(1)
    const {dispose, previousValue} = setupPreviousValue(value)

    expect(previousValue()).toBeUndefined()

    batch(() => {
      setValue(2)
      setValue(3)
    })

    expect(previousValue()).toBe(1)
    dispose()
  })

  it('should not update when the source signal ignores an equal value', () => {
    const [value, setValue] = createSignal(1)
    const {dispose, previousValue} = setupPreviousValue(value)

    expect(previousValue()).toBeUndefined()
    setValue(1)
    expect(previousValue()).toBeUndefined()
    setValue(2)
    expect(previousValue()).toBe(1)
    dispose()
  })
})
