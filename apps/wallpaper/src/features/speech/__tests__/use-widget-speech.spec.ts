/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {
  DEFAULT_POFFO_SPEECH,
  type WallpaperLibrary,
} from '@winter-love/wallpaper/settings/library-model'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {useWidgetSpeech} from '../use-widget-speech'

const {repository} = vi.hoisted(() => ({
  repository: {
    close: vi.fn(),
    read: vi.fn(),
    subscribe: vi.fn(),
  },
}))
vi.mock('@winter-love/wallpaper/settings/library-repository', () => ({
  createLibraryRepository: () => repository,
}))
afterEach(() => vi.resetAllMocks())
const snapshot = (wrap: boolean): WallpaperLibrary => ({
  history: [],
  websites: [],
  widgets: [
    {
      assetId: 'model',
      id: 'widget',
      speech: {...DEFAULT_POFFO_SPEECH, voice: {...DEFAULT_POFFO_VOICE, enabled: true}, wrap},
      x: null,
      y: null,
    },
  ],
})

it('should observe the widget preference without losing voice settings and dispose its subscription', async () => {
  let changed: () => void = () => undefined
  const stop = vi.fn()
  repository.subscribe.mockImplementation((callback) => {
    changed = callback
    return stop
  })
  repository.read.mockResolvedValue(snapshot(false))
  const hook = renderHook(() => useWidgetSpeech(() => 'widget'))
  await Promise.resolve()
  expect(hook.result.speech()).toEqual(snapshot(false).widgets[0].speech)
  repository.read.mockResolvedValue(snapshot(true))
  changed()
  await Promise.resolve()
  expect(hook.result.speech()).toEqual(snapshot(true).widgets[0].speech)
  hook.cleanup()
  expect(stop).toHaveBeenCalledOnce()
  expect(repository.close).toHaveBeenCalledOnce()
})
it('should ignore a stale read after the widget changes', async () => {
  const deferred = Promise.withResolvers<WallpaperLibrary>()
  repository.subscribe.mockReturnValue(vi.fn())
  repository.read.mockReturnValueOnce(deferred.promise).mockResolvedValue(snapshot(true))
  const [id, setId] = createSignal<string | undefined>('widget')
  const hook = renderHook(() => useWidgetSpeech(id))
  setId(undefined)
  deferred.resolve(snapshot(false))
  await Promise.resolve()
  expect(hook.result.speech()).toEqual(DEFAULT_POFFO_SPEECH)
  expect(hook.result.error()).toBeNull()
  hook.cleanup()
})
