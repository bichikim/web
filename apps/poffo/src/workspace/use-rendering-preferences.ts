import {createSignal} from 'solid-js'
import type {PlayerAntialiasing, PlayerRendererPreference} from '@winter-love/puppet/player'

export interface RenderingPreferences {
  readonly antialiasing: PlayerAntialiasing
  readonly renderer: PlayerRendererPreference
}

const STORAGE_KEY = 'poffo:rendering:v1'
const DEFAULT_PREFERENCES: RenderingPreferences = {antialiasing: 'auto', renderer: 'auto'}

export const RENDERER_OPTIONS = [
  'auto',
  'pixi',
  'pixi-webgl',
  'pixi-webgpu',
  'wgpu',
] as const satisfies readonly PlayerRendererPreference[]

const readPreferences = (value: unknown): RenderingPreferences | undefined => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('renderer' in value) ||
    !('antialiasing' in value)
  ) {
    return undefined
  }
  const saved = value.renderer
  const preference = saved === 'webgl' || saved === 'webgpu' ? `pixi-${saved}` : saved
  const renderer = RENDERER_OPTIONS.find((renderer) => renderer === preference)
  const antialiasing = (['auto', 'msaa', 'ssaa'] as const).find(
    (mode) => mode === value.antialiasing,
  )
  if (renderer !== undefined && antialiasing !== undefined) {
    return {antialiasing, renderer}
  }
  return undefined
}

/** Browser-level display settings; never part of model history or recovery snapshots. */
export const useRenderingPreferences = () => {
  let current = DEFAULT_PREFERENCES
  let initialError: string | null = null
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (stored !== null && stored !== undefined) {
      const saved = readPreferences(JSON.parse(stored))
      if (saved !== undefined) {
        current = saved
      }
    }
  } catch (cause) {
    if (!(cause instanceof SyntaxError)) {
      initialError = '렌더링 설정을 불러오지 못했습니다.'
    }
  }
  const [preferences, setPreferences] = createSignal(current)
  const [error, setError] = createSignal<string | null>(initialError)
  const update = (next: RenderingPreferences) => {
    current = next
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
    setAntialiasing: (antialiasing: PlayerAntialiasing) => update({...current, antialiasing}),
    setRenderer: (renderer: PlayerRendererPreference) => update({...current, renderer}),
  }
}
