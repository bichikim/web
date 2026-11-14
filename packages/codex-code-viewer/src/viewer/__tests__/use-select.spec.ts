/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {createStore, produce} from 'solid-js/store'
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

  it('should recover an out-of-range cursor to the current selection after options shrink', () => {
    const [options, setOptions] = createSignal(['alpha', 'bravo', 'charlie'])
    const onChange = vi.fn()
    const {result} = renderHook(() => useSelect({onChange, options, value: () => 'bravo'}))
    result.keyboard(new KeyboardEvent('keydown', {key: 'End'}))
    expect(result.activeIndex()).toBe(2)
    setOptions(['alpha', 'bravo'])
    expect(result.expanded()).toBe(true)
    expect(result.activeIndex()).toBe(1)
    expect(onChange).not.toHaveBeenCalled()
    result.keyboard(new KeyboardEvent('keydown', {key: 'Enter'}))
    expect(result.expanded()).toBe(false)
    expect(onChange.mock.calls).toEqual([['bravo']])
  })

  it('should recover to the fallback when the chosen option and active index are removed', () => {
    const [options, setOptions] = createSignal(['alpha', 'bravo', 'charlie'])
    const onChange = vi.fn()
    const {result} = renderHook(() => useSelect({onChange, options, value: () => undefined}))
    result.choose('charlie')
    result.toggle()
    expect(result.activeIndex()).toBe(2)
    setOptions(['x', 'y'])
    expect(result.value()).toBe('x')
    expect(result.activeIndex()).toBe(0)
    expect(onChange.mock.calls).toEqual([['charlie']])
    result.keyboard(new KeyboardEvent('keydown', {key: ' '}))
    expect(result.expanded()).toBe(false)
    expect(result.value()).toBe('x')
    expect(onChange.mock.calls).toEqual([['charlie'], ['x']])
  })

  it('should preserve a valid cursor across controlled value and option changes', () => {
    const [options, setOptions] = createSignal(['alpha', 'bravo', 'charlie'])
    const [value, setValue] = createSignal('alpha')
    const onChange = vi.fn()
    const {result} = renderHook(() => useSelect({onChange, options, value}))
    result.toggle()
    result.keyboard(new KeyboardEvent('keydown', {key: 'ArrowDown'}))
    expect(result.activeIndex()).toBe(1)
    expect(result.value()).toBe('alpha')
    setValue('charlie')
    expect(result.activeIndex()).toBe(1)
    setOptions(['x', 'y', 'z'])
    expect(result.activeIndex()).toBe(1)
    setOptions(['x', 'y'])
    expect(result.activeIndex()).toBe(1)
    expect(result.value()).toBe('charlie')
    expect(onChange).not.toHaveBeenCalled()
    result.keyboard(new KeyboardEvent('keydown', {key: 'Enter'}))
    expect(onChange.mock.calls).toEqual([['y']])
    expect(result.value()).toBe('charlie')
  })

  it('should dismiss an emptied list without committing or reopening on repopulation', () => {
    const [options, setOptions] = createSignal(['alpha', 'bravo', 'charlie'])
    const onChange = vi.fn()
    const {result} = renderHook(() => useSelect({onChange, options, value: () => undefined}))
    result.choose('bravo')
    result.toggle()
    result.keyboard(new KeyboardEvent('keydown', {key: 'End'}))
    setOptions([])
    expect(result.expanded()).toBe(false)
    expect(result.value()).toBeUndefined()
    expect(result.keyboard(new KeyboardEvent('keydown', {key: 'Enter'}))).toBe(false)
    setOptions(['alpha', 'bravo'])
    expect(result.expanded()).toBe(false)
    expect(result.value()).toBe('bravo')
    result.toggle()
    expect(result.activeIndex()).toBe(1)
    expect(onChange.mock.calls).toEqual([['bravo']])
  })

  it('should recover when a reactive store changes length without replacing its options array', () => {
    const [store, setStore] = createStore({options: ['alpha', 'bravo', 'charlie']})
    const options = store.options
    const onChange = vi.fn()
    const {result} = renderHook(() =>
      useSelect({onChange, options: () => store.options, value: () => 'alpha'}),
    )
    result.keyboard(new KeyboardEvent('keydown', {key: 'End'}))
    setStore(
      'options',
      produce((options) => {
        options.splice(1)
      }),
    )
    expect(store.options).toBe(options)
    expect(result.activeIndex()).toBe(0)
    expect(onChange).not.toHaveBeenCalled()
    result.keyboard(new KeyboardEvent('keydown', {key: 'Enter'}))
    expect(result.expanded()).toBe(false)
    expect(onChange.mock.calls).toEqual([['alpha']])
  })
})
