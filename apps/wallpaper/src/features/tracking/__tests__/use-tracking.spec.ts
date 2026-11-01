/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {getCurrentWebview} from '@tauri-apps/api/webview'
import type {Player} from '@winter-love/puppet/player'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {useTracking} from '../use-tracking'
import {useViewport} from '../use-viewport'

interface TrackingListener {
  (event: {payload: unknown}): void
}

vi.mock('../use-viewport', () => ({useViewport: vi.fn()}))
vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/webview', () => ({getCurrentWebview: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

test('should add native cursor or camera input and release it on disable', async () => {
  vi.mocked(useViewport).mockReturnValue(() => null)
  const handlers = new Map<string, TrackingListener>()
  const listen = vi.fn(async (name: string, handler: (event: {payload: unknown}) => void) => {
    handlers.set(name, handler)
    return () => {
      if (handlers.get(name) === handler) {
        handlers.delete(name)
      }
    }
  })
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(undefined)
  vi.mocked(getCurrentWebview).mockReturnValue({listen} as unknown as ReturnType<
    typeof getCurrentWebview
  >)
  let scheduled: FrameRequestCallback | null = null
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    scheduled = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    scheduled = null
  })
  const flush = () => {
    for (let index = 1; index < 100; index += 1) {
      const callback = scheduled
      scheduled = null
      callback?.(index * 16)
    }
  }
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    height: 100,
    left: 0,
    top: 0,
    width: 100,
  } as DOMRect)
  const player = {patchParameterBlends: vi.fn()}
  const [mode, setMode] = createSignal<PoffoTracking>('cursor')
  renderHook(() =>
    useTracking({
      bindings: () => ({headX: {blend: 'add'}}),
      canvas: () => canvas,
      mode,
      onError: vi.fn(),
      parameters: () => [{defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30}],
      player: () => player as unknown as Player,
    }),
  )
  await Promise.resolve()
  await Promise.resolve()
  handlers.get('poffo-cursor')?.({payload: {height: 100, width: 100, x: 300, y: 30}})
  flush()
  expect(player.patchParameterBlends.mock.lastCall?.[0]['face-x'].value).toBeCloseTo(12, 1)
  expect(player.patchParameterBlends.mock.lastCall?.[0]['face-x'].mode).toBe('add')
  expect(invoke).toHaveBeenCalledWith(
    'subscribe_poffo_cursor',
    expect.objectContaining({enabled: true}),
  )
  setMode('camera')
  await Promise.resolve()
  await Promise.resolve()
  expect(handlers.has('poffo-cursor')).toBe(false)
  handlers.get('poffo-face')?.({payload: {x: -1, y: 0}})
  flush()
  expect(player.patchParameterBlends.mock.lastCall?.[0]['face-x'].value).toBeCloseTo(-12, 1)
  expect(player.patchParameterBlends.mock.lastCall?.[0]['face-x'].mode).toBe('add')
  setMode('off')
  expect(handlers.size).toBe(0)
  expect(player.patchParameterBlends).toHaveBeenCalledWith({'face-x': undefined})
  expect(scheduled).toBeNull()
})

test('should use the actual target surface for camera previews and apply updated limits', async () => {
  vi.mocked(useViewport).mockReturnValue(() => ({
    height: 1000,
    scale: 2,
    width: 2000,
    x: 1000,
    y: 200,
  }))
  vi.mocked(isTauri).mockReturnValue(true)
  const handlers = new Map<string, TrackingListener>()
  vi.mocked(getCurrentWebview).mockReturnValue({
    listen: vi.fn(async (name: string, handler: TrackingListener) => {
      handlers.set(name, handler)
      return () => {
        if (handlers.get(name) === handler) {
          handlers.delete(name)
        }
      }
    }),
  } as unknown as ReturnType<typeof getCurrentWebview>)
  let scheduled: FrameRequestCallback | null = null
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    scheduled = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    scheduled = null
  })
  const flush = () => {
    for (let index = 1; index < 100; index += 1) {
      const callback = scheduled
      scheduled = null
      callback?.(index * 16)
    }
  }
  const canvas = document.createElement('canvas')
  const player = {patchParameterBlends: vi.fn()}
  const [surface, setSurface] = createSignal({aspect: 2, height: 1, left: 0, top: 0, width: 0.2})
  const [options, setOptions] = createSignal<PoffoTrackingOptions>({
    cameraX: 0.5,
    cameraY: 0.5,
    headLimitX: 30,
  })
  renderHook(() =>
    useTracking({
      bindings: () => undefined,
      cameraSurface: surface,
      canvas: () => canvas,
      mode: () => 'camera',
      onError: vi.fn(),
      options,
      parameters: () => [
        {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
        {defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1, positiveY: 'down'},
      ],
      player: () => player as unknown as Player,
    }),
  )
  await Promise.resolve()
  handlers.get('poffo-face')?.({payload: {x: 0, y: 0}})
  flush()
  expect(player.patchParameterBlends.mock.lastCall?.[0]['face-x'].value).toBeGreaterThan(0)
  setSurface({aspect: 2, height: 1, left: 0.8, top: 0, width: 0.2})
  setOptions({cameraX: 0.5, cameraY: 0.5, headLimitX: 3})
  await Promise.resolve()
  handlers.get('poffo-face')?.({payload: {x: 0, y: 0}})
  flush()
  expect(player.patchParameterBlends.mock.lastCall?.[0]['face-x'].value).toBeCloseTo(-3, 1)
  setOptions({cameraX: 0.5, cameraY: 0, eyeVerticalScale: 3.6, headLimitX: 3})
  await Promise.resolve()
  handlers.get('poffo-face')?.({payload: {x: 0, y: 0}})
  flush()
  const resting = player.patchParameterBlends.mock.lastCall?.[0]['gaze-y'].value!
  expect(resting).toBeLessThan(0)
  expect(resting).toBeGreaterThan(-1)
  handlers.get('poffo-face')?.({payload: {x: 0, y: 0.15}})
  flush()
  const upward = player.patchParameterBlends.mock.lastCall?.[0]['gaze-y'].value!
  expect(upward).toBeLessThan(resting)
  handlers.get('poffo-face')?.({payload: {x: 0, y: -0.15}})
  flush()
  expect(player.patchParameterBlends.mock.lastCall?.[0]['gaze-y'].value).toBeGreaterThan(resting)
  handlers.get('poffo-face')?.({payload: {detected: false, x: 0, y: 0}})
  flush()
  expect(player.patchParameterBlends.mock.lastCall?.[0]['gaze-y'].value).toBeCloseTo(0, 1)
  setOptions({eyeCenterY: 0.3, headCenterX: 2})
  expect(player.patchParameterBlends).toHaveBeenLastCalledWith({
    'face-x': {mode: 'overwrite', value: 2},
    'gaze-y': {mode: 'overwrite', value: -0.3},
  })
})

test('should apply edited centers without input while disabled and release zeroed centers', () => {
  vi.mocked(useViewport).mockReturnValue(() => null)
  const player = {patchParameterBlends: vi.fn()}
  const [options, setOptions] = createSignal<PoffoTrackingOptions>({
    eyeCenterY: 0.2,
    headCenterX: 4,
  })
  renderHook(() =>
    useTracking({
      bindings: () => undefined,
      canvas: () => document.createElement('canvas'),
      mode: () => 'off',
      onError: vi.fn(),
      options,
      parameters: () => [
        {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
        {defaultValue: 0, id: 'face-y', maximum: 30, minimum: -30},
        {defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1, positiveY: 'down'},
      ],
      player: () => player as unknown as Player,
    }),
  )
  expect(player.patchParameterBlends).toHaveBeenLastCalledWith({
    'face-x': {mode: 'overwrite', value: 4},
    'gaze-y': {mode: 'overwrite', value: -0.2},
  })
  setOptions({eyeCenterY: -0.4})
  expect(player.patchParameterBlends).toHaveBeenLastCalledWith({
    'gaze-y': {mode: 'overwrite', value: 0.4},
  })
  expect(player.patchParameterBlends).toHaveBeenCalledWith({
    'face-x': undefined,
    'gaze-y': undefined,
  })
  setOptions({eyeCenterY: 0})
  expect(player.patchParameterBlends).toHaveBeenLastCalledWith({'gaze-y': undefined})
})

test('should add center displacements and release them when switching to overwrite or disconnecting', () => {
  vi.mocked(useViewport).mockReturnValue(() => null)
  const player = {patchParameterBlends: vi.fn()}
  const [bindings, setBindings] = createSignal<PoffoTrackingBindings>({headX: {blend: 'add'}})
  const view = renderHook(() =>
    useTracking({
      bindings,
      canvas: () => document.createElement('canvas'),
      mode: () => 'off',
      onError: vi.fn(),
      options: () => ({headCenterX: 4}),
      parameters: () => [{defaultValue: 5, id: 'face-x', maximum: 30, minimum: -30}],
      player: () => player as unknown as Player,
    }),
  )
  expect(player.patchParameterBlends).toHaveBeenLastCalledWith({'face-x': {mode: 'add', value: 4}})
  setBindings({headX: {blend: 'overwrite'}})
  expect(player.patchParameterBlends).toHaveBeenCalledWith({'face-x': undefined})
  expect(player.patchParameterBlends).toHaveBeenLastCalledWith({
    'face-x': {mode: 'overwrite', value: 9},
  })
  setBindings({headX: {parameterId: null}})
  expect(player.patchParameterBlends).toHaveBeenLastCalledWith({'face-x': undefined})
  view.cleanup()
})
