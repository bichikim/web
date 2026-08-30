import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'

import {fetchWeatherFeed} from './client'
import type {WeatherFeed, WeatherLocation} from './contract'
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
  | {readonly location: WeatherLocation; readonly status: 'loading'}
  | {readonly feed: WeatherFeed; readonly status: 'ready'}
  | {readonly location: WeatherLocation; readonly status: 'error'}

export interface WeatherController {
  readonly enabled: Accessor<boolean>
  readonly onEnabledChange: (enabled: boolean) => void
  readonly location: Accessor<WeatherLocation>
  readonly onLocationChange: (location: WeatherLocation) => void
  readonly onSceneModeChange: (mode: WeatherSceneMode) => void
  readonly sceneCondition: Accessor<WeatherSceneCondition>
  readonly sceneMode: Accessor<WeatherSceneMode>
  readonly state: Accessor<WeatherState>
}

const isReadyForLocation = (
  state: WeatherState,
  locationId: WeatherLocation['id'],
): state is Extract<WeatherState, {readonly status: 'ready'}> =>
  state.status === 'ready' && state.feed.location.id === locationId

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
    location: DEFAULT_WEATHER_PREFERENCE.location,
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
    if (!isReadyForLocation(previousState, currentPreference.location.id)) {
      setFeedState({location: currentPreference.location, status: 'loading'})
    }

    try {
      const result = await fetchWeatherFeed(currentPreference.location.id)
      if (disposed || revision !== requestRevision) {
        return
      }

      switch (result.status) {
        case 'available':
          setFeedState({feed: result.feed, status: 'ready'})
          scheduleRefresh(getRefreshDelay(result.feed.expiresAt))
          return
        case 'collecting':
          if (isReadyForLocation(previousState, currentPreference.location.id)) {
            const stale = Date.parse(previousState.feed.expiresAt) <= Date.now()
            setFeedState({feed: {...previousState.feed, stale}, status: 'ready'})
          }
          scheduleRefresh(result.retryAfterMilliseconds ?? WEATHER_RETRY_MILLISECONDS)
          return
        case 'unavailable':
          if (isReadyForLocation(previousState, currentPreference.location.id)) {
            const stale = Date.parse(previousState.feed.expiresAt) <= Date.now()
            setFeedState({feed: {...previousState.feed, stale}, status: 'ready'})
          } else {
            setFeedState({location: currentPreference.location, status: 'error'})
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
        if (isReadyForLocation(previousState, currentPreference.location.id)) {
          const stale = Date.parse(previousState.feed.expiresAt) <= Date.now()
          setFeedState({feed: {...previousState.feed, stale}, status: 'ready'})
        } else {
          setFeedState({location: currentPreference.location, status: 'error'})
        }
        scheduleRefresh(WEATHER_RETRY_MILLISECONDS)
      }
    }
  }

  const persistPreference = (nextPreference: WeatherPreference) => {
    setStatusEnabled(nextPreference.enabled)
    setPreference(nextPreference)
    writeWeatherPreference(nextPreference).catch(() => {
      // Keep the in-memory preference active when persistence is unavailable.
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
    enabled: () => preference().enabled,
    location: () => preference().location,
    onEnabledChange: (enabled) => updateFeedRequirement({...preference(), enabled}),
    onLocationChange: (location) => updateFeedPreference({...preference(), location}),
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
