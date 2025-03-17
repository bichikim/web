import {createManualMemo} from '../'
import {createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'

describe('manualMemo', () => {
  it('should return a value', () => {
    const [source] = createSignal(1)
    let nunReactiveValue = 1
    const [value, forceUpdate] = createManualMemo(() => source() * 2 + nunReactiveValue)

    expect(value()).toBe(3)
    nunReactiveValue = 2
    expect(value()).toBe(3)
    forceUpdate()
    expect(value()).toBe(4)
  })
})
