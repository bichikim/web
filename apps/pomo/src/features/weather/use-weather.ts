import {createAsync} from '@solidjs/router'
import {
  type Accessor,
  batch,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'

import {createQueryRevalidationScheduler} from '../query-revalidation'
import type {WeatherFeed, WeatherLocation} from './contract'
import {
  DEFAULT_WEATHER_PREFERENCE,
  readWeatherPreference,
  type WeatherPreference,
  writeWeatherPreference,
} from './preference'
import {weatherFeedQuery, type WeatherFeedQueryResult} from './query'
import {resolveWeatherRevalidationSchedule} from './revalidation'
import {
  resolveWeatherSceneCondition,
  type WeatherSceneCondition,
  type WeatherSceneMode,
} from './scene-mode'

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

const isWeatherFeedRequired = (preference: WeatherPreference): boolean =>
  preference.enabled || preference.sceneMode === 'auto'

const getRetainedFeedState = (
  state: WeatherState,
  locationId: WeatherLocation['id'],
): WeatherState | null => {
  if (!isReadyForLocation(state, locationId)) {
    return null
  }

  const stale = Date.parse(state.feed.expiresAt) <= Date.now()
  return {feed: {...state.feed, stale}, status: 'ready'}
}

/** Owns weather preferences, presentation state, and the feed required by automatic scenes. */
export const useWeather = (): WeatherController => {
  const [preference, setPreference] = createSignal<WeatherPreference>(DEFAULT_WEATHER_PREFERENCE)
  const [preferenceReady, setPreferenceReady] = createSignal(false)
  const [statusEnabled, setStatusEnabled] = createSignal(true)
  const [feedState, setFeedState] = createSignal<WeatherState>({
    location: DEFAULT_WEATHER_PREFERENCE.location,
    status: 'loading',
  })
  let disposed = false

  const weatherResult = createAsync<WeatherFeedQueryResult | undefined>(async () => {
    const currentPreference = preference()
    if (!preferenceReady() || !isWeatherFeedRequired(currentPreference)) {
      return undefined
    }

    return weatherFeedQuery(currentPreference.location.id)
  })

  createEffect(() => {
    const currentPreference = preference()
    if (!preferenceReady()) {
      return
    }

    if (!isWeatherFeedRequired(currentPreference)) {
      setFeedState(DISABLED_WEATHER_STATE)
      return
    }

    const result = weatherResult()
    if (result === undefined || result.locationId !== currentPreference.location.id) {
      if (!isReadyForLocation(untrack(feedState), currentPreference.location.id)) {
        setFeedState({location: currentPreference.location, status: 'loading'})
      }
      return
    }

    const previousState = untrack(feedState)
    switch (result.status) {
      case 'available':
        setFeedState({feed: result.feed, status: 'ready'})
        return
      case 'collecting':
        setFeedState(
          getRetainedFeedState(previousState, currentPreference.location.id) ?? {
            location: currentPreference.location,
            status: 'loading',
          },
        )
        return
      case 'failed':
      case 'unavailable':
        setFeedState(
          getRetainedFeedState(previousState, currentPreference.location.id) ?? {
            location: currentPreference.location,
            status: 'error',
          },
        )
        return
      default: {
        const exhaustiveResult: never = result
        return exhaustiveResult
      }
    }
  })

  createQueryRevalidationScheduler({
    key: () => weatherFeedQuery.keyFor(preference().location.id),
    schedule: () => {
      const currentPreference = preference()
      return resolveWeatherRevalidationSchedule({
        active: preferenceReady() && isWeatherFeedRequired(currentPreference),
        locationId: currentPreference.location.id,
        result: weatherResult.latest,
      })
    },
  })

  const persistPreference = (nextPreference: WeatherPreference) => {
    setStatusEnabled(nextPreference.enabled)
    setPreference(nextPreference)
    writeWeatherPreference(nextPreference).catch(() => {
      // Keep the in-memory preference active when persistence is unavailable.
    })
  }

  onMount(() => {
    readWeatherPreference()
      .then((storedPreference) => {
        if (disposed) {
          return
        }

        batch(() => {
          setStatusEnabled(storedPreference.enabled)
          setPreference(storedPreference)
          setPreferenceReady(true)
        })
      })
      .catch(() => {
        if (!disposed) {
          setPreferenceReady(true)
        }
      })

    onCleanup(() => {
      disposed = true
    })
  })

  return {
    enabled: () => preference().enabled,
    location: () => preference().location,
    onEnabledChange: (enabled) => persistPreference({...preference(), enabled}),
    onLocationChange: (location) => persistPreference({...preference(), location}),
    onSceneModeChange: (sceneMode) => persistPreference({...preference(), sceneMode}),
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
