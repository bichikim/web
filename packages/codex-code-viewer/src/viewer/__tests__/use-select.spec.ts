/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useSelect} from '../use-select'

describe('useSelect', () => {
  afterEach(cleanup)

  it('should follow the first option until the user chooses a value', () => {
    const [options, setOptions] = createSignal<readonly string[]>([])
    const onChange = vi.fn()
    const {result} = renderHook(() => useSelect({onChange, options, value: () => undefined}))
    expect(result.value()).toBeUndefined()
    setOptions(['alpha', 'bravo'])
    expect(result.value()).toBe('alpha')
    setOptions(['charlie'])
    expect(result.value()).toBe('charlie')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('should use the first option while the chosen value is absent and restore it when available', () => {
    const [options, setOptions] = createSignal(['alpha', 'bravo'])
    const onChange = vi.fn()
    const {result} = renderHook(() => useSelect({onChange, options, value: () => undefined}))
    result.choose('bravo')
    setOptions(['charlie', 'bravo', 'alpha'])
    expect(result.value()).toBe('bravo')
    setOptions(['charlie'])
    expect(result.value()).toBe('charlie')
    setOptions(['alpha', 'bravo'])
    expect(result.value()).toBe('bravo')
    expect(onChange.mock.calls).toEqual([['bravo']])
  })

  it('should expose no value for empty options and restore the chosen value on repopulation', () => {
    const [options, setOptions] = createSignal(['alpha', 'bravo'])
    const onChange = vi.fn()
    const {result} = renderHook(() => useSelect({onChange, options, value: () => undefined}))
    result.choose('bravo')
    setOptions([])
    expect(result.value()).toBeUndefined()
    setOptions(['alpha', 'bravo'])
    expect(result.value()).toBe('bravo')
    expect(onChange.mock.calls).toEqual([['bravo']])
  })

  it('should keep external values authoritative even outside the options', () => {
    const [options, setOptions] = createSignal(['alpha', 'bravo'])
    const [value, setValue] = createSignal<string | undefined>('external')
    const onChange = vi.fn()
    const {result} = renderHook(() => useSelect({onChange, options, value}))
    result.choose('bravo')
    expect(result.value()).toBe('external')
    setOptions([])
    expect(result.value()).toBe('external')
    setValue('')
    expect(result.value()).toBe('')
    setValue(undefined)
    expect(result.value()).toBeUndefined()
    setOptions(['alpha', 'bravo'])
    expect(result.value()).toBe('bravo')
    expect(onChange.mock.calls).toEqual([['bravo']])
  })

  it('should retain an empty string option as a chosen value', () => {
    const onChange = vi.fn()
    const {result} = renderHook(() =>
      useSelect({onChange, options: () => ['alpha', ''], value: () => undefined}),
    )
    result.choose('')
    expect(result.value()).toBe('')
    expect(onChange.mock.calls).toEqual([['']])
  })
})
