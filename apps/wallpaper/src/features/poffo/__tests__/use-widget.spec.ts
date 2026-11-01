/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import {createEffect} from 'solid-js'
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {isTauri} from '@tauri-apps/api/core'
import {useWidget} from '../use-widget'

vi.mock('@winter-love/wallpaper/settings/library-repository', () => ({
  createLibraryRepository: vi.fn(),
}))
vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
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
  vi.mocked(createLibraryRepository).mockReturnValue({
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
