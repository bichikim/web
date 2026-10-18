/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createEffect, createSignal, runWithOwner} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type BackgroundMedia, type BackgroundPreferences, DEFAULT_BACKGROUND} from '../model'
import {type BackgroundController} from '../use-background'
import {usePlayback} from '../use-playback'
import {getMonotonicTime} from 'src/utils/get-monotonic-time'
import {createBackground} from './fixtures/controller'

vi.mock('src/utils/get-monotonic-time', () => ({getMonotonicTime: vi.fn()}))

const monotonicTime = vi.mocked(getMonotonicTime)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  monotonicTime.mockImplementation(() => vi.getMockedSystemTime()?.getTime() ?? 0)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})
const setup = (videoMode: BackgroundPreferences['videoMode'], initializeVideo = true) => {
  const [preferences, setPreferences] = createSignal({...DEFAULT_BACKGROUND, videoMode})
  const background = {
    failedIds: () => [],
    items: () => [
      {id: 'video', kind: 'video', name: 'video', size: 1},
      {id: 'photo', kind: 'photo', name: 'photo', size: 1},
    ],
    preferences,
  } as unknown as BackgroundController
  const hook = renderHook(() => usePlayback({background}))
  if (initializeVideo) {
    hook.result.onVideoStart()
    hook.result.onReady()
  }
  return {...hook, setPreferences}
}
it('should ignore display time in end mode', () => {
  const {result, cleanup} = setup('end')
  vi.advanceTimersByTime(20_000)
  expect(result.current()?.id).toBe('video')
  result.onEnded()
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should count video playback toward the hold deadline', () => {
  const {result, cleanup} = setup('hold')
  vi.advanceTimersByTime(4000)
  result.onEnded()
  vi.advanceTimersByTime(5999)
  expect(result.current()?.id).toBe('video')
  vi.advanceTimersByTime(1)
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should preserve the ready deadline when video starts after the frame is ready', () => {
  const {result, cleanup} = setup('hold', false)
  result.onReady()
  vi.advanceTimersByTime(5000)
  result.onVideoStart()
  vi.advanceTimersByTime(4000)
  result.onEnded()
  vi.advanceTimersByTime(999)
  expect(result.current()?.id).toBe('video')
  vi.advanceTimersByTime(1)
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should finish a long video before leaving hold mode', () => {
  const {result, cleanup} = setup('hold')
  vi.advanceTimersByTime(15_000)
  expect(result.current()?.id).toBe('video')
  result.onEnded()
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should leave loop mode at the deadline even before video completion', () => {
  const {result, cleanup} = setup('loop')
  vi.advanceTimersByTime(10_000)
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should preserve elapsed time when duration changes', () => {
  const {result, cleanup, setPreferences} = setup('loop')
  vi.advanceTimersByTime(4000)
  setPreferences((previous) => ({...previous, photoSeconds: 5}))
  vi.advanceTimersByTime(1000)
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should ignore wall-clock jumps when rescheduling the deadline', () => {
  const {result, cleanup, setPreferences} = setup('loop')
  vi.advanceTimersByTime(4000)
  const wallTime = Date.now()
  vi.spyOn(Date, 'now').mockReturnValue(wallTime + 60_000)
  setPreferences((previous) => ({...previous}))
  expect(result.current()?.id).toBe('video')
  vi.advanceTimersByTime(5999)
  expect(result.current()?.id).toBe('video')
  vi.advanceTimersByTime(1)
  expect(result.current()?.id).toBe('photo')
  cleanup()
})
it('should handle a video ending during the entry transition', () => {
  const {result, cleanup} = setup('end')
  result.onLoading()
  result.onVideoStart()
  result.onEnded()
  expect(result.current()?.id).toBe('video')
  result.onReady()
  expect(result.current()?.id).toBe('photo')
  cleanup()
})

const photo = (id: string): BackgroundMedia => Object.freeze({id, kind: 'photo', name: id, size: 1})
const setupPlaylist = (initial: readonly BackgroundMedia[], failed: readonly string[] = []) => {
  const [items, setItems] = createSignal(initial)
  const [failedIds, setFailedIds] = createSignal(failed)
  const background = {
    ...createBackground(),
    failedIds,
    items,
    markFailed: (id: string) => setFailedIds((previous) => [...previous, id]),
  }
  const hook = renderHook(() => usePlayback({background}))
  return {...hook, setFailedIds, setItems}
}

it('should exclude failed IDs without changing the selected item identity', () => {
  const first = photo('first')
  const {result, cleanup} = setupPlaylist(
    Object.freeze([photo('failed'), first, photo('next')]),
    Object.freeze(['failed', 'failed', 'absent']),
  )
  expect(result.current()).toBe(first)
  expect(result.candidates()).toEqual(['next'])
  cleanup()
})

it('should preserve queued order and duplicate additions across catalog updates', () => {
  const first = photo('first')
  const second = photo('second')
  const third = photo('third')
  const added = photo('added')
  const {result, cleanup, setItems} = setupPlaylist(Object.freeze([first, second, third]))
  const generation = result.generation()
  setItems(Object.freeze([third, added, first, added, second]))
  expect(result.current()).toBe(first)
  expect(result.generation()).toBe(generation)
  expect(result.candidates()).toEqual(['second', 'third', 'added', 'added'])
  setItems(Object.freeze([added, first, second, added]))
  expect(result.candidates()).toEqual(['second', 'added', 'added'])
  cleanup()
})

it('should retain a consumed companion as seen when the catalog changes', () => {
  const first = photo('first')
  const companion = photo('companion')
  const next = photo('next')
  const {result, cleanup, setItems} = setupPlaylist([first, companion, next])
  result.consume('companion')
  expect(result.candidates()).toEqual(['next'])
  setItems(Object.freeze([companion, photo('added'), first, next, companion]))
  expect(result.candidates()).toEqual(['next', 'added'])
  result.onReady()
  vi.advanceTimersByTime(DEFAULT_BACKGROUND.photoSeconds * 1000)
  expect(result.current()).toBe(next)
  cleanup()
})

it('should react to failed IDs and restart the current frame only when it becomes ineligible', () => {
  const first = photo('first')
  const {result, cleanup, setFailedIds} = setupPlaylist([first, photo('second'), photo('third')])
  const generation = result.generation()
  setFailedIds(Object.freeze(['second', 'second']))
  expect(result.current()).toBe(first)
  expect(result.candidates()).toEqual(['third'])
  expect(result.generation()).toBe(generation)
  result.onError()
  expect(result.current()?.id).toBe('third')
  expect(result.generation()).toBe(generation + 1)
  cleanup()
})

it('should clear an empty catalog and recover when eligible items return', () => {
  const first = photo('first')
  const {result, cleanup, setItems, setFailedIds} = setupPlaylist([first])
  setItems(Object.freeze([]))
  expect(result.current()).toBeNull()
  expect(result.candidates()).toEqual([])
  setFailedIds(Object.freeze(['first']))
  setItems(Object.freeze([first]))
  expect(result.current()).toBeNull()
  setFailedIds(Object.freeze([]))
  expect(result.current()).toBe(first)
  cleanup()
})

it('should expose consumed candidates reactively without advancing the primary frame', () => {
  const {result, cleanup, owner} = setupPlaylist([
    photo('first'),
    photo('companion'),
    photo('next'),
  ])
  const candidates = vi.fn()
  runWithOwner(owner, () => createEffect(() => candidates(result.candidates())))
  const generation = result.generation()
  result.consume('companion')
  expect(candidates).toHaveBeenLastCalledWith(['next'])
  expect(result.current()?.id).toBe('first')
  expect(result.generation()).toBe(generation)
  cleanup()
})
