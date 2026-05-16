import {batch, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {createPreviousValue} from './index'

describe('createPreviousValue', () => {
  it('should return undefined on first call', () => {
    const value = 1
    const previousValue = createPreviousValue(value)
    expect(previousValue()).toBe(undefined)
  })

  it('should return the previous value on subsequent calls', () => {
    const [value, setValue] = createSignal(1)
    const previousValue = createPreviousValue(value)
    expect(previousValue()).toBe(undefined)
    setValue(2)
    expect(previousValue()).toBe(1)
  })

  it('should return the value before the latest update after multiple changes', () => {
    const [value, setValue] = createSignal(1)
    const previousValue = createPreviousValue(value)

    expect(previousValue()).toBeUndefined()
    setValue(2)
    expect(previousValue()).toBe(1)
    setValue(3)
    expect(previousValue()).toBe(2)
  })

  it('should skip intermediate values when updates are batched', () => {
    const [value, setValue] = createSignal(1)
    const previousValue = createPreviousValue(value)

    expect(previousValue()).toBeUndefined()

    batch(() => {
      setValue(2)
      setValue(3)
    })

    expect(previousValue()).toBe(1)
  })

  it('should not update when the source signal ignores an equal value', () => {
    const [value, setValue] = createSignal(1)
    const previousValue = createPreviousValue(value)

    expect(previousValue()).toBeUndefined()
    setValue(1)
    expect(previousValue()).toBeUndefined()
    setValue(2)
    expect(previousValue()).toBe(1)
  })
})
