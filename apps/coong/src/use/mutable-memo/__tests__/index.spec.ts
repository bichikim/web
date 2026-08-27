/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'

import {useMutableMemo} from '../index'

describe('useMutableMemo', () => {
  it('should derive a value reactively and allow an explicit update', () => {
    const [source, setSource] = createSignal(2)
    const {result} = renderHook(() => useMutableMemo(() => source() * 2))
    const [value, setValue] = result

    expect(value()).toBe(4)
    setSource(3)
    expect(value()).toBe(6)
    setValue(9)
    expect(value()).toBe(9)
  })
})
