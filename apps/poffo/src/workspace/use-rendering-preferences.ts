import {createSignal} from 'solid-js'
import type {PlayerAntialiasing, PlayerRendererPreference} from '@winter-love/puppet/player'

export interface RenderingPreferences {
  readonly antialiasing: PlayerAntialiasing
  readonly renderer: PlayerRendererPreference
}

const STORAGE_KEY = 'poffo:rendering:v1'
const DEFAULT_PREFERENCES: RenderingPreferences = {antialiasing: 'auto', renderer: 'auto'}

const isPreferences = (value: unknown): value is RenderingPreferences =>
  typeof value === 'object' &&
  value !== null &&
  'renderer' in value &&
  typeof value.renderer === 'string' &&
  ['auto', 'webgl', 'webgpu'].includes(value.renderer) &&
  'antialiasing' in value &&
  typeof value.antialiasing === 'string' &&
  ['auto', 'msaa', 'ssaa'].includes(value.antialiasing)

/** Browser-level display settings; never part of model history or recovery snapshots. */
export const useRenderingPreferences = () => {
  const [preferences, setPreferences] = createSignal(DEFAULT_PREFERENCES)
  const [error, setError] = createSignal<string | null>(null)
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (stored !== null && stored !== undefined) {
      const parsed: unknown = JSON.parse(stored)
      if (isPreferences(parsed)) {
        setPreferences({antialiasing: parsed.antialiasing, renderer: parsed.renderer})
      }
    }
  } catch (cause) {
    if (!(cause instanceof SyntaxError)) {
      setError('렌더링 설정을 불러오지 못했습니다.')
    }
  }
  const update = (next: RenderingPreferences) => {
    setPreferences(next)
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      setError('렌더링 설정을 저장하지 못했습니다.')
    }
  }
  return {
    dismissError: () => setError(null),
    error,
    preferences,
    reportError: (message: string) => setError(message),
    setAntialiasing: (antialiasing: PlayerAntialiasing) => update({...preferences(), antialiasing}),
    setRenderer: (renderer: PlayerRendererPreference) => update({...preferences(), renderer}),
  }
}
