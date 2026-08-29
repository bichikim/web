import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'

import {fetchWeatherFeed} from './client'
import type {WeatherCitySlug, WeatherFeed} from './contract'
import {
  DEFAULT_WEATHER_PREFERENCE,
  readWeatherPreference,
  type WeatherPreference,
  writeWeatherPreference,
} from './preference'
import {
  resolveWeatherSceneCondition,
  type WeatherSceneCondition,
  type WeatherSceneMode,
} from './scene-mode'

const MINIMUM_REFRESH_DELAY_MILLISECONDS = 1_000
const REFRESH_SAFETY_DELAY_MILLISECONDS = 1_000
const WEATHER_RETRY_MILLISECONDS = 60_000
const DISABLED_WEATHER_STATE = {status: 'disabled'} as const

export type WeatherState =
  | {readonly status: 'disabled'}
  | {readonly citySlug: WeatherCitySlug; readonly status: 'loading'}
  | {readonly feed: WeatherFeed; readonly status: 'ready'}
  | {readonly citySlug: WeatherCitySlug; readonly status: 'error'}

export interface WeatherController {
  readonly citySlug: Accessor<WeatherCitySlug>
  readonly enabled: Accessor<boolean>
  readonly onCityChange: (citySlug: WeatherCitySlug) => void
  readonly onEnabledChange: (enabled: boolean) => void
  readonly onSceneModeChange: (mode: WeatherSceneMode) => void
  readonly sceneCondition: Accessor<WeatherSceneCondition>
  readonly sceneMode: Accessor<WeatherSceneMode>
  readonly state: Accessor<WeatherState>
}

const isReadyForCity = (
  state: WeatherState,
  citySlug: WeatherCitySlug,
): state is Extract<WeatherState, {readonly status: 'ready'}> =>
  state.status === 'ready' && state.feed.city.slug === citySlug

const getRefreshDelay = (expiresAt: string): number =>
  Math.max(
    MINIMUM_REFRESH_DELAY_MILLISECONDS,
    Date.parse(expiresAt) - Date.now() + REFRESH_SAFETY_DELAY_MILLISECONDS,
  )

const isWeatherFeedRequired = (preference: WeatherPreference): boolean =>
  preference.enabled || preference.sceneMode === 'auto'

/** Owns weather preferences, presentation state, and the feed required by automatic scenes. */
export const useWeather = (): WeatherController => {
  const [preference, setPreference] = createSignal<WeatherPreference>(DEFAULT_WEATHER_PREFERENCE)
  const [statusEnabled, setStatusEnabled] = createSignal(true)
  const [feedState, setFeedState] = createSignal<WeatherState>({
    citySlug: DEFAULT_WEATHER_PREFERENCE.citySlug,
    status: 'loading',
  })
  let requestRevision = 0
  let disposed = false
  let refreshTimer: number | undefined

  const clearRefreshTimer = () => {
    if (refreshTimer !== undefined) {
      window.clearTimeout(refreshTimer)
      refreshTimer = undefined
    }
  }

  const scheduleRefresh = (delayMilliseconds: number) => {
    clearRefreshTimer()
    refreshTimer = window.setTimeout(() => {
      refresh().catch(() => undefined)
    }, delayMilliseconds)
  }

  const refresh = async (currentPreference = preference()) => {
    clearRefreshTimer()
    requestRevision += 1
    const revision = requestRevision

    if (!isWeatherFeedRequired(currentPreference)) {
      setFeedState(DISABLED_WEATHER_STATE)
      return
    }

    const previousState = feedState()
    if (!isReadyForCity(previousState, currentPreference.citySlug)) {
      setFeedState({citySlug: currentPreference.citySlug, status: 'loading'})
    }

    try {
      const result = await fetchWeatherFeed(currentPreference.citySlug)
      if (disposed || revision !== requestRevision) {
        return
      }

      switch (result.status) {
        case 'available':
          setFeedState({feed: result.feed, status: 'ready'})
          scheduleRefresh(getRefreshDelay(result.feed.expiresAt))
          return
        case 'collecting':
          if (isReadyForCity(previousState, currentPreference.citySlug)) {
            const stale = Date.parse(previousState.feed.expiresAt) <= Date.now()
            setFeedState({feed: {...previousState.feed, stale}, status: 'ready'})
          }
          scheduleRefresh(result.retryAfterMilliseconds ?? WEATHER_RETRY_MILLISECONDS)
          return
        case 'unavailable':
          if (isReadyForCity(previousState, currentPreference.citySlug)) {
            const stale = Date.parse(previousState.feed.expiresAt) <= Date.now()
            setFeedState({feed: {...previousState.feed, stale}, status: 'ready'})
          } else {
            setFeedState({citySlug: currentPreference.citySlug, status: 'error'})
          }
          scheduleRefresh(result.retryAfterMilliseconds ?? WEATHER_RETRY_MILLISECONDS)
          return
        default: {
          const exhaustiveResult: never = result
          return exhaustiveResult
        }
      }
    } catch {
      if (!disposed && revision === requestRevision) {
        if (isReadyForCity(previousState, currentPreference.citySlug)) {
          const stale = Date.parse(previousState.feed.expiresAt) <= Date.now()
          setFeedState({feed: {...previousState.feed, stale}, status: 'ready'})
        } else {
          setFeedState({citySlug: currentPreference.citySlug, status: 'error'})
        }
        scheduleRefresh(WEATHER_RETRY_MILLISECONDS)
      }
    }
  }

  const persistPreference = (nextPreference: WeatherPreference) => {
    setStatusEnabled(nextPreference.enabled)
    setPreference(nextPreference)
    writeWeatherPreference(nextPreference).catch(() => {
      // Storage adapters recover internally; this guards unexpected host failures.
    })
  }

  const updateFeedPreference = (nextPreference: WeatherPreference) => {
    persistPreference(nextPreference)
    refresh(nextPreference).catch(() => undefined)
  }

  const updateFeedRequirement = (nextPreference: WeatherPreference) => {
    const currentPreference = preference()
    persistPreference(nextPreference)

    if (isWeatherFeedRequired(currentPreference) !== isWeatherFeedRequired(nextPreference)) {
      refresh(nextPreference).catch(() => undefined)
    }
  }

  onMount(() => {
    const initialRevision = requestRevision

    readWeatherPreference()
      .then((storedPreference) => {
        if (!disposed && requestRevision === initialRevision) {
          setStatusEnabled(storedPreference.enabled)
          setPreference(storedPreference)
          refresh(storedPreference).catch(() => undefined)
        }
      })
      .catch(() => {
        if (!disposed) {
          refresh().catch(() => undefined)
        }
      })

    onCleanup(() => {
      disposed = true
      clearRefreshTimer()
    })
  })

  return {
    citySlug: () => preference().citySlug,
    enabled: () => preference().enabled,
    onCityChange: (citySlug) => updateFeedPreference({...preference(), citySlug}),
    onEnabledChange: (enabled) => updateFeedRequirement({...preference(), enabled}),
    onSceneModeChange: (sceneMode) => updateFeedRequirement({...preference(), sceneMode}),
    sceneCondition: () => {
      const currentState = feedState()
      const observedCondition =
        currentState.status === 'ready' ? currentState.feed.current.condition : 'unknown'

      return resolveWeatherSceneCondition(preference().sceneMode, observedCondition)
    },
    sceneMode: () => preference().sceneMode,
    state: () => (statusEnabled() ? feedState() : DISABLED_WEATHER_STATE),
  }
}
