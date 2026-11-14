/** @vitest-environment jsdom */
import {cleanup, fireEvent, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {useStudioShortcuts} from '../use-studio-shortcuts'
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
test.each([
  {
    keys: 'Meta+S',
    label: 'Cmd+S',
    modifier: {metaKey: true},
    other: {ctrlKey: true},
    platform: 'MacIntel',
  },
  {
    keys: 'Control+S',
    label: 'Ctrl+S',
    modifier: {ctrlKey: true},
    other: {metaKey: true},
    platform: 'Win32',
  },
])(
  'should use only the $platform save and open shortcuts',
  ({platform, label, keys, modifier, other}) => {
    vi.stubGlobal('navigator', {platform})
    const onSave = vi.fn()
    const onOpen = vi.fn()
    const {result} = renderHook(() => useStudioShortcuts({enabled: () => true, onOpen, onSave}))
    expect(result).toEqual({
      openKeys: keys.replace('S', 'O'),
      openLabel: label.replace('S', 'O'),
      saveKeys: keys,
      saveLabel: label,
    })
    expect(fireEvent.keyDown(document.body, {key: 's', ...other})).toBe(true)
    expect(onSave).not.toHaveBeenCalled()
    expect(fireEvent.keyDown(document.body, {key: 's', ...modifier})).toBe(false)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(fireEvent.keyDown(document.body, {key: 'o', ...other})).toBe(true)
    expect(onOpen).not.toHaveBeenCalled()
    expect(fireEvent.keyDown(document.body, {key: 'o', ...modifier})).toBe(false)
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledTimes(1)
  },
)
test.each([
  {key: 'o', shiftKey: true},
  {altKey: true, key: 'o'},
  {isComposing: true, key: 'o'},
  {key: 'o', metaKey: true},
  {key: 's', shiftKey: true},
  {altKey: true, key: 's'},
  {isComposing: true, key: 's'},
  {key: 's', metaKey: true},
  {key: 'a'},
])('should leave other key combinations and composing input untouched: %o', (event) => {
  vi.stubGlobal('navigator', {platform: 'Win32'})
  const onSave = vi.fn()
  const onOpen = vi.fn()
  renderHook(() => useStudioShortcuts({enabled: () => true, onOpen, onSave}))
  expect(fireEvent.keyDown(document.body, {ctrlKey: true, ...event})).toBe(true)
  expect(onSave).not.toHaveBeenCalled()
  expect(onOpen).not.toHaveBeenCalled()
})
test.each(['s', 'o'])(
  'should prevent the browser action without repeating Studio actions when %s is held',
  (key) => {
    vi.stubGlobal('navigator', {platform: 'MacIntel'})
    const onSave = vi.fn()
    const onOpen = vi.fn()
    renderHook(() => useStudioShortcuts({enabled: () => true, onOpen, onSave}))
    expect(fireEvent.keyDown(document.body, {key, metaKey: true, repeat: true})).toBe(false)
    expect(onSave).not.toHaveBeenCalled()
    expect(onOpen).not.toHaveBeenCalled()
  },
)
test('should follow workspace availability and remove the listener when disposed', () => {
  vi.stubGlobal('navigator', {platform: 'Win32'})
  const [enabled, setEnabled] = createSignal(false)
  const onSave = vi.fn()
  const onOpen = vi.fn()
  const mounted = renderHook(() => useStudioShortcuts({enabled, onOpen, onSave}))
  expect(fireEvent.keyDown(document.body, {ctrlKey: true, key: 'S'})).toBe(true)
  expect(fireEvent.keyDown(document.body, {ctrlKey: true, key: 'O'})).toBe(true)
  expect(onOpen).not.toHaveBeenCalled()
  setEnabled(true)
  expect(fireEvent.keyDown(document.body, {ctrlKey: true, key: 'S'})).toBe(false)
  expect(onSave).toHaveBeenCalledTimes(1)
  expect(fireEvent.keyDown(document.body, {ctrlKey: true, key: 'O'})).toBe(false)
  expect(onOpen).toHaveBeenCalledTimes(1)
  mounted.cleanup()
  expect(fireEvent.keyDown(document.body, {ctrlKey: true, key: 'S'})).toBe(true)
  expect(fireEvent.keyDown(document.body, {ctrlKey: true, key: 'O'})).toBe(true)
  expect(onOpen).toHaveBeenCalledTimes(1)
  expect(onSave).toHaveBeenCalledTimes(1)
})
test('should save from a focused input without moving focus or handling a consumed event', () => {
  vi.stubGlobal('navigator', {platform: 'MacIntel'})
  const onSave = vi.fn()
  const onOpen = vi.fn()
  renderHook(() => useStudioShortcuts({enabled: () => true, onOpen, onSave}))
  const input = document.createElement('input')
  document.body.append(input)
  input.focus()
  expect(fireEvent.keyDown(input, {key: 's', metaKey: true})).toBe(false)
  expect(onSave).toHaveBeenCalledTimes(1)
  expect(document.activeElement).toBe(input)
  const consumed = new KeyboardEvent('keydown', {cancelable: true, key: 's', metaKey: true})
  consumed.preventDefault()
  globalThis.dispatchEvent(consumed)
  expect(onSave).toHaveBeenCalledTimes(1)
  input.remove()
})
