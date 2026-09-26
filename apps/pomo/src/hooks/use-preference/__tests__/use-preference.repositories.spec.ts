/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider, usePreference} from '..'
import {readScreenSaverDelay, writeScreenSaverDelay} from 'src/features/screen-saver/storage'
import {
  readDisplayThemePreference,
  writeDisplayThemePreference,
} from 'src/features/display-theme/storage'
import {
  readPDisplayPreferences,
  writePDisplayPreferences,
} from 'src/features/focus-room-display-preferences/storage'
import {DEFAULT_P_DISPLAY_PREFERENCES} from 'src/features/focus-room-display-preferences/model'
import {
  readPScenePreferences,
  writePScenePreferences,
} from 'src/features/focus-room-scene-preferences/storage'
import {DEFAULT_P_SCENE_PREFERENCES} from 'src/features/focus-room-scene-preferences/model'
import {readPSceneStyle, writePSceneStyle} from 'src/features/focus-room-animation/style-storage'
import {
  DEFAULT_WEATHER_PREFERENCE,
  readWeatherPreference,
  writeWeatherPreference,
} from 'src/features/weather/preference'
import {
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  readDialogueVolumeDuckingSettings,
  writeDialogueVolumeDuckingSettings,
} from 'src/features/focus-room-dialogue/volume-ducking-settings'
import {
  DEFAULT_RANDOM_EVENT_SETTINGS,
  readRandomEventSettings,
  writeRandomEventSettings,
} from 'src/features/focus-room-dialogue/random-event-settings'
import {
  readAutoStartPreference,
  writeAutoStartPreference,
} from 'src/features/pomodoro-timer/auto-start-storage'
import {lunarDirectionStorage} from 'src/features/tools/selection-storage'
import {
  DEFAULT_SERVICE_SETTINGS,
  readServiceSettings,
  writeServiceSettings,
} from 'src/features/tools/service-storage'
import {playlistPreference} from 'src/features/focus-room-audio/playlist-storage'

const native = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: native}))
vi.mock('src/utils/runtime-storage/has-native-storage-bridge', () => ({
  hasNativeStorageBridge: () => true,
}))
vi.mock('src/features/weather/location-names', () => ({
  restoreWeatherLocationNames: ({location}: {location: unknown}) => Promise.resolve(location),
}))

interface RepositoryCase {
  readonly name: string
  readonly key: string
  readonly initial: unknown
  readonly edited: unknown
  readonly latest: unknown
  readonly stored: unknown
  readonly read: () => Promise<unknown>
  readonly write: (value: unknown) => Promise<unknown>
}

const repositoryCase = <Value>(options: {
  readonly name: string
  readonly key: string
  readonly initial: Value
  readonly edited: Value
  readonly latest: Value
  readonly stored?: unknown
  readonly read: () => Promise<Value | null>
  readonly write: (value: Value) => Promise<unknown>
}): RepositoryCase => ({
  ...options,
  stored: options.stored ?? options.initial,
  // Each case supplies values matching its repository contract.
  write: (value) => options.write(value as Value),
})

const cases: readonly RepositoryCase[] = [
  repositoryCase({
    edited: 'off',
    initial: '10m',
    key: 'pomo:screen-saver-delay:v1',
    latest: '20m',
    name: 'screen saver',
    read: readScreenSaverDelay,
    write: writeScreenSaverDelay,
  }),
  repositoryCase({
    edited: 'dark',
    initial: 'system',
    key: 'pomo:display-theme:v1',
    latest: 'bright',
    name: 'theme',
    read: readDisplayThemePreference,
    write: writeDisplayThemePreference,
  }),
  repositoryCase({
    edited: {...DEFAULT_P_DISPLAY_PREFERENCES, playerVisible: false},
    initial: DEFAULT_P_DISPLAY_PREFERENCES,
    key: 'pomo:focus-room-display-preferences:v1',
    latest: {...DEFAULT_P_DISPLAY_PREFERENCES, toolsButtonVisible: false},
    name: 'display',
    read: readPDisplayPreferences,
    write: writePDisplayPreferences,
  }),
  repositoryCase({
    edited: {...DEFAULT_P_SCENE_PREFERENCES, activity: 'typing'},
    initial: DEFAULT_P_SCENE_PREFERENCES,
    key: 'pomo:focus-room-scene-preferences:v1',
    latest: {...DEFAULT_P_SCENE_PREFERENCES, activity: 'writing'},
    name: 'scene',
    read: readPScenePreferences,
    write: writePScenePreferences,
  }),
  repositoryCase({
    edited: 'scribble',
    initial: 'original',
    key: 'pomo:focus-room-scene-style:v1',
    latest: 'original',
    name: 'style',
    read: readPSceneStyle,
    write: writePSceneStyle,
  }),
  repositoryCase({
    edited: {...DEFAULT_WEATHER_PREFERENCE, enabled: false},
    initial: DEFAULT_WEATHER_PREFERENCE,
    key: 'pomo:weather-preference:v2',
    latest: {...DEFAULT_WEATHER_PREFERENCE, sceneMode: 'rain'},
    name: 'weather',
    read: readWeatherPreference,
    write: writeWeatherPreference,
  }),
  repositoryCase({
    edited: {...DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS, playerVolumePercent: 20},
    initial: DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
    key: 'pomo:dialogue-volume-ducking-settings:v2',
    latest: {...DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS, playerVolumePercent: 80},
    name: 'volume',
    read: readDialogueVolumeDuckingSettings,
    write: writeDialogueVolumeDuckingSettings,
  }),
  repositoryCase({
    edited: {...DEFAULT_RANDOM_EVENT_SETTINGS, maximumMinutes: 30},
    initial: DEFAULT_RANDOM_EVENT_SETTINGS,
    key: 'pomo:random-event-settings:v1',
    latest: {...DEFAULT_RANDOM_EVENT_SETTINGS, maximumMinutes: 40},
    name: 'random events',
    read: readRandomEventSettings,
    write: writeRandomEventSettings,
  }),
  repositoryCase({
    edited: true,
    initial: false,
    key: 'pomo:timer-auto-start:v2',
    latest: false,
    name: 'auto start',
    read: readAutoStartPreference,
    stored: {isEnabled: false, savedAt: 0},
    write: writeAutoStartPreference,
  }),
  repositoryCase({
    edited: 'lunar',
    initial: 'solar',
    key: lunarDirectionStorage.key,
    latest: 'solar',
    name: 'tool selection',
    read: lunarDirectionStorage.read,
    write: lunarDirectionStorage.write,
  }),
  repositoryCase({
    edited: {...DEFAULT_SERVICE_SETTINGS, start: '2026-01-01'},
    initial: DEFAULT_SERVICE_SETTINGS,
    key: 'pomo:service-settings:v1',
    latest: {...DEFAULT_SERVICE_SETTINGS, start: '2026-02-01'},
    name: 'service',
    read: readServiceSettings,
    write: writeServiceSettings,
  }),
  {
    edited: {trackIds: ['edited']},
    initial: {trackIds: ['original']},
    key: playlistPreference.key,
    latest: {trackIds: ['latest']},
    name: 'playlist',
    read: playlistPreference.storage.read,
    stored: {savedAt: 0, trackIds: ['original'], version: 1},
    write: async (value) => playlistPreference.storage.write(playlistPreference.key, value),
  },
]

beforeEach(() => {
  globalThis.localStorage.clear()
  native.getItem.mockReset().mockResolvedValue(null)
  native.setItem.mockReset().mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it.each(cases)(
  'should keep edits during $name restoration and serialize later saves',
  async (entry) => {
    const restoring = Promise.withResolvers<string | null>()
    native.getItem.mockReturnValueOnce(restoring.promise)
    const firstSave = Promise.withResolvers<void>()
    native.setItem.mockReturnValueOnce(firstSave.promise)
    const {
      result: [value, setValue],
    } = renderHook(
      () =>
        usePreference({
          defaultValue: entry.initial,
          key: entry.key,
          parse: (input) => input,
          storage: {read: entry.read, write: (_key, input) => entry.write(input)},
        }),
      {wrapper: PreferenceProvider},
    )
    await vi.waitFor(() => expect(native.getItem).toHaveBeenCalled())
    setValue(entry.edited)
    expect(value()).toEqual(entry.edited)
    expect(native.setItem).not.toHaveBeenCalled()
    restoring.resolve(JSON.stringify(entry.stored))
    await vi.waitFor(() => expect(native.setItem).toHaveBeenCalledTimes(1))
    setValue(entry.latest)
    expect(value()).toEqual(entry.latest)
    expect(native.setItem).toHaveBeenCalledTimes(1)
    firstSave.resolve()
    await vi.waitFor(() => expect(native.setItem).toHaveBeenCalledTimes(2))
    expect(value()).toEqual(entry.latest)
    const saved = native.setItem.mock.lastCall
    expect(saved?.[0]).toBe(entry.key)
    const payload = JSON.parse(saved?.[1] ?? 'null')
    if (entry.name === 'auto start') {
      expect(payload.isEnabled).toBe(entry.latest)
    } else if (entry.name === 'playlist') {
      expect(payload).toMatchObject(entry.latest as object)
    } else if (entry.name === 'screen saver') {
      expect(payload).toMatchObject({delay: entry.latest, savedAt: expect.any(Number)})
    } else if (entry.name === 'theme') {
      expect(payload).toMatchObject({preference: entry.latest, savedAt: expect.any(Number)})
    } else {
      expect(payload).toEqual(entry.latest)
    }
  },
)
