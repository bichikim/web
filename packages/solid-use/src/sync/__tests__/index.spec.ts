import {createSignal} from 'solid-js'
import {sync} from '../'
import {describe, expect, it, vi} from 'vitest'

describe('manualMemo', () => {
  it('should return a value', () => {
    const [value] = sync(123)

    expect(value()).toBe(123)
  })
  it('should update the value', () => {
    const [source, setSource] = createSignal(123)
    const [value, setValue] = sync(source)

    expect(value()).toBe(123)

    setSource(456)

    expect(value()).toBe(456)

    setValue(789)

    expect(value()).toBe(789)

    expect(source()).toBe(456)

    setSource(101_112)

    expect(value()).toBe(101_112)
  })
})
