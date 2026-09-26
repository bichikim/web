import {createAsync} from '@solidjs/router'
import {type Accessor, createEffect, createSignal, untrack} from 'solid-js'

import {usePreference} from 'src/hooks/use-preference'
import {createParsedPreferenceStorage} from '../parsed-preference-storage'

import {createQueryRevalidationScheduler} from '../query-revalidation'
import type {WeatherFeed, WeatherLocation} from './contract'
import {
  DEFAULT_WEATHER_PREFERENCE,
  parseWeatherPreference,
  readWeatherPreference,
  WEATHER_PREFERENCE_STORAGE_KEY,
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

const weatherPreferenceStorage = createParsedPreferenceStorage({
  invalidMessage: 'Invalid weather preference.',
  parse: parseWeatherPreference,
  read: () => readWeatherPreference(),
  write: (value) => writeWeatherPreference(value),
})

export type WeatherState =
  | {readonly status: 'disabled'}
  | {readonly location: WeatherLocation; readonly status: 'loading'}
  | {readonly feed: WeatherFeed; readonly status: 'ready'}
  | {readonly location: WeatherLocation; readonly status: 'error'}

export interface WeatherController {
  readonly enabled: Accessor<boolean>
  readonly isReady: Accessor<boolean>
  readonly onEnabledChange: (enabled: boolean) => void
  readonly location: Accessor<WeatherLocation>
  readonly onLocationChange: (location: WeatherLocation) => void
  readonly onSceneModeChange: (mode: WeatherSceneMode) => void
  readonly sceneCondition: Accessor<WeatherSceneCondition | undefined>
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

const getReadyFeedState = (
  feed: WeatherFeed,
): Extract<WeatherState, {readonly status: 'ready'}> => {
  const expiryTimestamp = Date.parse(feed.expiresAt)
  const stale = feed.stale || Number.isNaN(expiryTimestamp) || expiryTimestamp <= Date.now()
  return {feed: {...feed, stale}, status: 'ready'}
}

const getRetainedFeedState = (
  state: WeatherState,
  locationId: WeatherLocation['id'],
): WeatherState | null => {
  if (!isReadyForLocation(state, locationId)) {
    return null
  }

  return getReadyFeedState(state.feed)
}

/** Owns weather preferences, presentation state, and the feed required by automatic scenes. */
export const useWeather = (): WeatherController => {
  const [storedPreference, setStoredPreference] = usePreference({
    defaultValue: DEFAULT_WEATHER_PREFERENCE,
    key: WEATHER_PREFERENCE_STORAGE_KEY,
    onError: () => undefined,
    parse: parseWeatherPreference,
    storage: weatherPreferenceStorage,
  })
  const [feedState, setFeedState] = createSignal<WeatherState>({
    location: DEFAULT_WEATHER_PREFERENCE.location,
    status: 'loading',
  })
  const preference = () => storedPreference() ?? DEFAULT_WEATHER_PREFERENCE
  const preferenceReady = () => storedPreference() !== null
  const isWeatherEnabled = () => {
    const currentPreference = storedPreference()
    return currentPreference !== null && currentPreference.enabled
  }

  const sceneReady = () => {
    const currentPreference = storedPreference()
    if (currentPreference === null || currentPreference.sceneMode !== 'auto') {
      return currentPreference !== null
    }

    const currentState = feedState()
    return currentState.status === 'ready' && !currentState.feed.stale
  }

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
        setFeedState(getReadyFeedState(result.feed))
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

  const persistPreference = (changes: Partial<WeatherPreference>) => {
    setStoredPreference({...preference(), ...changes})
  }

  return {
    enabled: isWeatherEnabled,
    isReady: sceneReady,
    location: () => preference().location,
    onEnabledChange: (enabled) => persistPreference({enabled}),
    onLocationChange: (location) => persistPreference({location}),
    onSceneModeChange: (sceneMode) => persistPreference({sceneMode}),
    sceneCondition: () => {
      const currentPreference = preference()
      const currentState = feedState()
      if (
        currentPreference.sceneMode === 'auto' &&
        (currentState.status !== 'ready' || currentState.feed.stale)
      ) {
        return undefined
      }

      const observedCondition =
        currentState.status === 'ready' ? currentState.feed.current.condition : 'unknown'

      return resolveWeatherSceneCondition(currentPreference.sceneMode, observedCondition)
    },
    sceneMode: () => preference().sceneMode,
    state: () => (isWeatherEnabled() ? feedState() : DISABLED_WEATHER_STATE),
  }
}
