/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import type {SelectTrackOptions} from '../types'
import {usePlaybackOrder} from '../use-playback-order'

const repeatKey = 'pomo:music-repeat:v1'
const shuffleKey = 'pomo:music-shuffle:v1'
const createOrder = (onSelect: (selection: SelectTrackOptions) => void = () => undefined) =>
  usePlaybackOrder({
    createShuffleQueue: () => [1],
    currentIndex: () => 0,
    initialQueue: [1],
    onRestart: () => undefined,
    onSelect,
    onStop: () => undefined,
    trackCount: () => 2,
  })

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it.each(['none', 'repeat-all', 'repeat-one'] as const)(
  'should restore repeat mode %s and disabled shuffle after a provider remount',
  (mode) => {
    const first = renderHook(createOrder, {wrapper: PreferenceProvider})
    if (mode === 'none') {
      first.result.toggleRepeatMode('repeat-all')
    }
    if (mode === 'repeat-one') {
      first.result.toggleRepeatMode('repeat-one')
    }
    first.result.toggleShuffle()
    first.cleanup()
    const {result} = renderHook(createOrder, {wrapper: PreferenceProvider})
    expect(result.repeatMode()).toBe(mode)
    expect(result.shuffleEnabled()).toBe(false)
  },
)

it('should ignore invalid persisted playback modes without overwriting them on mount', () => {
  localStorage.setItem(repeatKey, '"forever"')
  localStorage.setItem(shuffleKey, '"false"')
  const write = vi.spyOn(Storage.prototype, 'setItem')
  const {result} = renderHook(createOrder, {wrapper: PreferenceProvider})
  expect(result.repeatMode()).toBe('repeat-all')
  expect(result.shuffleEnabled()).toBe(true)
  expect(write).not.toHaveBeenCalled()
})

it('should preserve saved repeat mode when shuffle changes during asynchronous restoration', async () => {
  const pending = Promise.withResolvers<unknown>()
  const write = vi.fn()
  const {result} = renderHook(createOrder, {
    wrapper: (props) => (
      <PreferenceProvider
        storage={{
          read: (key) => pending.promise.then(() => (key === repeatKey ? 'repeat-one' : true)),
          write,
        }}
      >
        {props.children}
      </PreferenceProvider>
    ),
  })
  result.toggleShuffle()
  expect(write).not.toHaveBeenCalled()
  pending.resolve(undefined)
  await vi.waitFor(() => expect(result.repeatMode()).toBe('repeat-one'))
  expect(result.shuffleEnabled()).toBe(false)
  expect(write).toHaveBeenCalledExactlyOnceWith(shuffleKey, false)
})

it('should report a failed asynchronous save and persist subsequent edits in order', async () => {
  const pending = Promise.withResolvers<unknown>()
  const error = new Error('storage unavailable')
  const onError = vi.fn()
  const write = vi.fn().mockReturnValueOnce(pending.promise).mockReturnValue(null)
  const {result} = renderHook(createOrder, {
    wrapper: (props) => (
      <PreferenceProvider onError={onError} storage={{read: () => null, write}}>
        {props.children}
      </PreferenceProvider>
    ),
  })
  result.toggleRepeatMode('repeat-one')
  result.toggleRepeatMode('repeat-all')
  expect(write).toHaveBeenCalledTimes(1)
  pending.reject(error)
  await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(2))
  expect(onError).toHaveBeenCalledExactlyOnceWith(error)
  expect(write.mock.calls).toEqual([
    [repeatKey, 'repeat-one'],
    [repeatKey, 'repeat-all'],
  ])
  expect(result.repeatMode()).toBe('repeat-all')
})

it('should reset shuffle navigation when another consumer changes the stored mode', () => {
  const onSelect = vi.fn()
  const {result} = renderHook(() => ({first: createOrder(), second: createOrder(onSelect)}), {
    wrapper: PreferenceProvider,
  })
  result.second.handleEnded()
  onSelect.mockClear()
  result.first.toggleShuffle()
  expect(result.second.shuffleEnabled()).toBe(false)
  result.first.toggleRepeatMode('repeat-all')
  result.first.toggleShuffle()
  result.second.handleEnded()
  expect(onSelect).toHaveBeenCalledExactlyOnceWith({index: 1, shouldResume: true})
})

it('should reset an exhausted shuffle queue when another tab enables shuffle', () => {
  const onSelect = vi.fn()
  const {result} = renderHook(() => createOrder(onSelect), {wrapper: PreferenceProvider})
  result.toggleShuffle()
  result.toggleRepeatMode('repeat-all')
  localStorage.setItem(shuffleKey, 'true')
  globalThis.dispatchEvent(
    new StorageEvent('storage', {key: shuffleKey, storageArea: localStorage}),
  )
  result.handleEnded()
  expect(onSelect).toHaveBeenCalledExactlyOnceWith({index: 1, shouldResume: true})
  localStorage.setItem(shuffleKey, 'false')
  globalThis.dispatchEvent(
    new StorageEvent('storage', {key: shuffleKey, storageArea: localStorage}),
  )
  expect(result.shuffleEnabled()).toBe(false)
})
