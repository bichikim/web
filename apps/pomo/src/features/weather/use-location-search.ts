import {createSignal} from 'solid-js'
import {type AsyncSearchStatus, useAsyncSearch} from 'src/hooks/use-async-search'

import {searchWeatherLocations} from './location-client'
import type {WeatherLocation} from './contract'

const SEARCH_DELAY_MILLISECONDS = 300
const MINIMUM_QUERY_LENGTH = 2

export type WeatherLocationSearchStatus = AsyncSearchStatus

export interface WeatherLocationSearchController {
  readonly onQueryChange: (query: string) => void
  readonly onSelect: (location: WeatherLocation) => void
  readonly results: () => ReadonlyArray<WeatherLocation>
  readonly status: () => WeatherLocationSearchStatus
}

/** Debounces world-city search and cancels requests superseded by newer input. */
export const useWeatherLocationSearch = (): WeatherLocationSearchController => {
  const [query, setQuery] = createSignal('', {equals: false})
  const search = useAsyncSearch({
    delayMs: SEARCH_DELAY_MILLISECONDS,
    minLength: MINIMUM_QUERY_LENGTH,
    query,
    search: (query, signal) => searchWeatherLocations({query, signal}),
  })

  return {
    onQueryChange: setQuery,
    onSelect: search.reset,
    results: search.results,
    status: search.status,
  }
}
