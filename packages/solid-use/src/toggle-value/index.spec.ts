import {createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {toggleValue} from './'
import {renderHook} from '@solidjs/testing-library'

describe('toggleValue', () => {
  it('should return true if value is undefined', () => {
    const {
      result: {toggledValue, setToggleValue, setValue},
      cleanup,
    } = renderHook(() => {
      const [valueAccessor, setValue] = createSignal(456)
      const [toggleValueAccessor, setToggleValue] = createSignal(true)

      expect(toggleValue(123, true)()).toBe(123)
      expect(toggleValue(123, false)()).toBe(undefined)
      expect(toggleValue(undefined, true)()).toBe(undefined)
      expect(toggleValue(undefined, false)()).toBe(undefined)

      return {
        setToggleValue,
        setValue,
        toggleValueAccessor,
        toggledValue: toggleValue(valueAccessor, toggleValueAccessor),
      }
    })

    expect(toggledValue()).toBe(456)
    setToggleValue(false)
    expect(toggledValue()).toBe(undefined)
    setToggleValue(true)
    expect(toggledValue()).toBe(456)
    setValue(123)
    expect(toggledValue()).toBe(123)
    cleanup()
  })
})
