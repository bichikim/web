import {createSignal, onCleanup} from 'solid-js'

import {searchWeatherLocations} from './location-client'
import type {WeatherLocation} from './contract'

const SEARCH_DELAY_MILLISECONDS = 300
const MINIMUM_QUERY_LENGTH = 2

export type WeatherLocationSearchStatus = 'error' | 'idle' | 'ready' | 'searching'

export interface WeatherLocationSearchController {
  readonly onQueryChange: (query: string) => void
  readonly onSelect: (location: WeatherLocation) => void
  readonly results: () => ReadonlyArray<WeatherLocation>
  readonly status: () => WeatherLocationSearchStatus
}

/** Debounces world-city search and cancels requests superseded by newer input. */
export const useWeatherLocationSearch = (): WeatherLocationSearchController => {
  const [results, setResults] = createSignal<ReadonlyArray<WeatherLocation>>([])
  const [status, setStatus] = createSignal<WeatherLocationSearchStatus>('idle')
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let searchRequest: AbortController | null = null
  let revision = 0

  const cancelSearch = () => {
    if (searchTimer !== null) {
      clearTimeout(searchTimer)
      searchTimer = null
    }
    searchRequest?.abort()
    searchRequest = null
  }

  const onQueryChange = (query: string) => {
    cancelSearch()
    revision += 1
    const currentRevision = revision
    const normalizedQuery = query.trim()

    if (normalizedQuery.length < MINIMUM_QUERY_LENGTH) {
      setResults([])
      setStatus('idle')
      return
    }

    setResults([])
    setStatus('searching')
    searchTimer = setTimeout(() => {
      searchTimer = null
      const controller = new AbortController()
      searchRequest = controller
      searchWeatherLocations({query: normalizedQuery, signal: controller.signal})
        .then((locations) => {
          if (revision === currentRevision) {
            setResults(locations)
            setStatus('ready')
          }
        })
        .catch(() => {
          if (!controller.signal.aborted && revision === currentRevision) {
            setResults([])
            setStatus('error')
          }
        })
        .finally(() => {
          if (revision === currentRevision) {
            searchRequest = null
          }
        })
    }, SEARCH_DELAY_MILLISECONDS)
  }

  const onSelect = (_location: WeatherLocation) => {
    cancelSearch()
    revision += 1
    setResults([])
    setStatus('idle')
  }

  onCleanup(cancelSearch)

  return {onQueryChange, onSelect, results, status}
}
