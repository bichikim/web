import {manualMemo} from '../'
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

describe('manualMemo', () => {
  it('should return a value', () => {
    const [source, setSource] = createSignal(1)
    let nunReactiveValue = 1
    const [value, forceUpdate] = manualMemo(() => source() * 2 + nunReactiveValue)

    expect(value()).toBe(3)

    nunReactiveValue = 2

    expect(value()).toBe(3)

    forceUpdate()

    expect(value()).toBe(4)
  })
})
