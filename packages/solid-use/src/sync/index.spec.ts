import {createSignal} from 'solid-js'
import {sync} from './'
import {describe, expect, it} from 'vitest'
import {renderHook} from '@solidjs/testing-library'

describe('manualMemo', () => {
  it('should return a value', () => {
    const {
      result: [value],
      cleanup,
    } = renderHook(() => sync(123))

    expect(value()).toBe(123)
    cleanup()
  })

  it('should update the value', () => {
    const {
      result: {
        source,
        sync: [value, setValue],
        setSource,
      },
      cleanup,
    } = renderHook(() => {
      const [source, setSource] = createSignal(123)

      return {
        setSource,
        source,
        sync: sync(source),
      }
    })

    expect(value()).toBe(123)
    setSource(456)
    expect(value()).toBe(456)
    setValue(789)
    expect(value()).toBe(789)
    expect(source()).toBe(456)
    setSource(101_112)
    expect(value()).toBe(101_112)
    cleanup()
  })
})
