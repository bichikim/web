/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import {createEffect} from 'solid-js'
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createBuiltinLibrary} from '../../builtin-assets/create-builtin-library'
import type {PoffoWidget, WallpaperLibrary} from '@winter-love/wallpaper/settings/library-model'
import {isTauri} from '@tauri-apps/api/core'
import {useWidget} from '../use-widget'

vi.mock('../../builtin-assets/create-builtin-library', () => ({
  createBuiltinLibrary: vi.fn(),
}))
vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('should ignore a stale widget read after a newer notification has loaded', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const actual = await vi.importActual<
    typeof import('@winter-love/wallpaper/settings/library-repository')
  >('@winter-love/wallpaper/settings/library-repository')
  const repository = actual.createLibraryRepository(`widget-read-race-${crypto.randomUUID()}`)
  const stale = Promise.withResolvers<WallpaperLibrary>()
  const current: PoffoWidget = {
    assetId: 'character',
    id: 'widget',
    trackingOptions: {headResponseX: 2},
    x: null,
    y: null,
  }
  let notify: () => void = () => undefined
  vi.mocked(createBuiltinLibrary).mockReturnValue({
    ...repository,
    read: vi
      .fn()
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValue({history: [], websites: [], widgets: [current]}),
    subscribe: (refresh) => {
      notify = refresh
      return vi.fn()
    },
  })
  const {result} = renderHook(() => useWidget(() => 'widget'))
  notify()
  await waitFor(() => expect(result.trackingOptions()?.headResponseX).toBe(2), {interval: 1})
  stale.resolve({
    history: [],
    websites: [],
    widgets: [{...current, trackingOptions: {headResponseX: 1}}],
  })
  await stale.promise
  expect(result.trackingOptions()?.headResponseX).toBe(2)
})

it('should ignore a stale read failure after a newer widget read has succeeded', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const actual = await vi.importActual<
    typeof import('@winter-love/wallpaper/settings/library-repository')
  >('@winter-love/wallpaper/settings/library-repository')
  const repository = actual.createLibraryRepository(`widget-error-race-${crypto.randomUUID()}`)
  const stale = Promise.withResolvers<WallpaperLibrary>()
  const current: PoffoWidget = {assetId: 'character', id: 'widget', x: null, y: null}
  let notify: () => void = () => undefined
  vi.mocked(createBuiltinLibrary).mockReturnValue({
    ...repository,
    read: vi
      .fn()
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValue({history: [], websites: [], widgets: [current]}),
    subscribe: (refresh) => {
      notify = refresh
      return vi.fn()
    },
  })
  const {result} = renderHook(() => useWidget(() => 'widget'))
  notify()
  await waitFor(() => expect(result.assetId()).toBe('character'), {interval: 1})
  const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  try {
    stale.reject(new Error('An obsolete read failed'))
    await stale.promise.catch(() => undefined)
    await Promise.resolve()
    expect(result.error()).toBeNull()
    expect(logged).not.toHaveBeenCalled()
  } finally {
    logged.mockRestore()
  }
})

it('should feed the selected input profile to the character renderer after input changes', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const actual = await vi.importActual<
    typeof import('@winter-love/wallpaper/settings/library-repository')
  >('@winter-love/wallpaper/settings/library-repository')
  const repository = actual.createLibraryRepository(`widget-inputs-${crypto.randomUUID()}`)
  let snapshot: PoffoWidget = {
    assetId: 'character',
    id: 'inputs',
    tracking: 'cursor',
    trackingProfiles: {
      camera: {bindings: {headX: {parameterId: 'face'}}, options: {headFollowSpeed: 0.4}},
      'camera-pose': {bindings: {headX: {parameterId: 'pose'}}, options: {headFollowSpeed: 2}},
      cursor: {bindings: {headX: {parameterId: 'mouse'}}, options: {headFollowSpeed: 1}},
    },
    x: null,
    y: null,
  }
  let notify: () => void = () => undefined
  vi.mocked(createBuiltinLibrary).mockReturnValue({
    ...repository,
    read: async () => ({history: [], websites: [], widgets: [structuredClone(snapshot)]}),
    subscribe: (refresh) => {
      notify = refresh
      return vi.fn()
    },
  })
  const {result} = renderHook(() => useWidget(() => 'inputs'))
  await (
    [
      ['cursor', 1, 'mouse'],
      ['camera', 0.4, 'face'],
      ['camera-pose', 2, 'pose'],
      ['cursor', 1, 'mouse'],
    ] as const
  ).reduce(
    (pending, [mode, speed, parameter]) =>
      pending.then(async () => {
        snapshot = {...snapshot, tracking: mode}
        notify()
        await waitFor(() => expect(result.trackingOptions()?.headFollowSpeed).toBe(speed), {
          interval: 1,
        })
        expect(result.trackingBindings()?.headX?.parameterId).toBe(parameter)
      }),
    Promise.resolve(),
  )
})

it('should retain tracking inputs on unrelated snapshots and react to actual nested changes', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const actual = await vi.importActual<
    typeof import('@winter-love/wallpaper/settings/library-repository')
  >('@winter-love/wallpaper/settings/library-repository')
  const repository = actual.createLibraryRepository(`widget-snapshot-${crypto.randomUUID()}`)
  let snapshot: PoffoWidget = {
    assetId: 'builtin:ash',
    id: 'gaze-widget',
    speech: {enabled: true, lipsync: {source: 'voice'}, x: 0.9, y: 0.05},
    tracking: 'cursor',
    trackingBindings: {headX: {parameterId: 'ParamAngleX'}},
    trackingOptions: {headResponseX: 1},
    x: null,
    y: null,
  }
  let notify: () => void = () => undefined
  vi.mocked(createBuiltinLibrary).mockReturnValue({
    ...repository,
    read: async () => ({history: [], websites: [], widgets: [structuredClone(snapshot)]}),
    subscribe: (refresh) => {
      notify = refresh
      return vi.fn()
    },
  })
  const seen: (readonly [number | undefined, string | null | undefined])[] = []
  const {result} = renderHook(() => {
    const widget = useWidget(() => 'gaze-widget')
    createEffect(() => {
      const options = widget.trackingOptions()
      const bindings = widget.trackingBindings()
      if (options !== undefined && bindings !== undefined) {
        seen.push([options.headResponseX, bindings.headX?.parameterId])
      }
    })
    return widget
  })
  await waitFor(() => expect(seen).toEqual([[1, 'ParamAngleX']]), {interval: 1, timeout: 100})
  snapshot = {...snapshot, speech: {...snapshot.speech!, lipsync: {source: 'off'}}}
  notify()
  await waitFor(() => expect(result.lipsync()?.source).toBe('off'), {interval: 1, timeout: 100})
  expect(seen).toEqual([[1, 'ParamAngleX']])
  snapshot = {...snapshot, trackingOptions: {headResponseX: 2}}
  notify()
  await waitFor(() => expect(result.trackingOptions()?.headResponseX).toBe(2), {
    interval: 1,
    timeout: 100,
  })
  expect(seen).toEqual([
    [1, 'ParamAngleX'],
    [2, 'ParamAngleX'],
  ])
  snapshot = {
    ...snapshot,
    speech: {
      ...snapshot.speech!,
      enabled: false,
      lipsync: {source: 'microphone'},
      voice: {
        enabled: false,
        gpu: true,
        language: 'ko',
        model: 'int8',
        provider: 'local',
        speed: 1,
        voice: 'Sora',
        volume: 80,
      },
    },
  }
  notify()
  await waitFor(() => expect(result.lipsync()?.source).toBe('microphone'), {
    interval: 1,
    timeout: 100,
  })
  snapshot = {...snapshot, speech: {...snapshot.speech!, lipsync: {source: 'voice'}}}
  notify()
  await waitFor(() => expect(result.lipsync()).toBeUndefined(), {interval: 1, timeout: 100})
  snapshot = {...snapshot, trackingBindings: {headX: {parameterId: 'ParamEyeBallX'}}}
  notify()
  await waitFor(() => expect(result.trackingBindings()?.headX?.parameterId).toBe('ParamEyeBallX'), {
    interval: 1,
    timeout: 100,
  })
  expect(seen).toEqual([
    [1, 'ParamAngleX'],
    [2, 'ParamAngleX'],
    [2, 'ParamEyeBallX'],
  ])
})

it('should report a failed menu update without leaving a rejected event handler', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const actual = await vi.importActual<
    typeof import('@winter-love/wallpaper/settings/library-repository')
  >('@winter-love/wallpaper/settings/library-repository')
  const repository = actual.createLibraryRepository(`widget-menu-failure-${crypto.randomUUID()}`)
  const failure = new Error('Storage unavailable')
  const toggle = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined)
  const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(createBuiltinLibrary).mockReturnValue({...repository, toggleWidgetAction: toggle})
  try {
    const {result} = renderHook(() => useWidget(() => 'menu-widget'))
    await expect(result.toggleAction('tiny')).resolves.toBeUndefined()
    expect(result.error()).toBe('행동을 변경하지 못했어요.')
    expect(toggle).toHaveBeenCalledExactlyOnceWith('menu-widget', 'tiny')
    expect(logged).toHaveBeenCalledWith('Poffo action update failed', failure)
    await result.toggleAction('tiny')
    expect(result.error()).toBeNull()
  } finally {
    logged.mockRestore()
  }
})

it('should apply current Ash arm defaults when opening a widget without opening settings', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const actual = await vi.importActual<
    typeof import('../../builtin-assets/create-builtin-library')
  >('../../builtin-assets/create-builtin-library')
  const storage = await vi.importActual<
    typeof import('@winter-love/wallpaper/settings/library-repository')
  >('@winter-love/wallpaper/settings/library-repository')
  const name = `widget-arms-${crypto.randomUUID()}`
  const legacy = storage.createLibraryRepository(name)
  const saved = await legacy.addWidget('builtin:ash')
  legacy.close()
  const repository = actual.createBuiltinLibrary(name)
  vi.mocked(createBuiltinLibrary).mockReturnValue(repository)
  const hook = renderHook(() => useWidget(() => saved.id))
  await waitFor(
    () =>
      expect(hook.result.touch()).toMatchObject({
        drag: true,
        enabled: true,
        jointResponse: {elbow: 0.6, shoulder: 0.25, wrist: 1},
        parameters: {
          Param_Angle_Rotation21: {axis: 'y', invert: true},
          Param_Angle_Rotation24: {axis: 'y'},
        },
      }),
    {interval: 1},
  )
  hook.cleanup()
})
