import 'server-only'

import {eq, sql} from 'drizzle-orm'

import {
  LEGACY_WEATHER_LOCATIONS,
  type WeatherCitySlug,
  type WeatherLocation,
  type WeatherLocationId,
} from 'src/features/weather'
import {type Database, getDatabase, weatherLocations} from '../database'
import {
  type OpenWeatherSearchLocation,
  searchOpenWeatherLocations,
  type SearchOpenWeatherLocationsOptions,
} from './openweather-client'
import {reserveOpenWeatherRequest} from './provider-quota'

export interface WorldWeatherLocation extends WeatherLocation {
  readonly latitude: number
  readonly longitude: number
  readonly providerLocationId: string
}

interface LegacyWorldWeatherLocation extends WorldWeatherLocation {
  readonly legacyCitySlug: WeatherCitySlug
}

const LEGACY_LOCATION_MAXIMUM_DISTANCE_DEGREES = 0.05
const LEGACY_LOCATION_PROVIDER_COUNTRY = 'KR'

const LEGACY_WORLD_WEATHER_LOCATIONS = {
  busan: {
    ...LEGACY_WEATHER_LOCATIONS.busan,
    latitude: 35.1796,
    longitude: 129.0756,
    providerLocationId: 'legacy:busan',
  },
  daegu: {
    ...LEGACY_WEATHER_LOCATIONS.daegu,
    latitude: 35.8714,
    longitude: 128.6014,
    providerLocationId: 'legacy:daegu',
  },
  daejeon: {
    ...LEGACY_WEATHER_LOCATIONS.daejeon,
    latitude: 36.3504,
    longitude: 127.3845,
    providerLocationId: 'legacy:daejeon',
  },
  gwangju: {
    ...LEGACY_WEATHER_LOCATIONS.gwangju,
    latitude: 35.1595,
    longitude: 126.8526,
    providerLocationId: 'legacy:gwangju',
  },
  incheon: {
    ...LEGACY_WEATHER_LOCATIONS.incheon,
    latitude: 37.4563,
    longitude: 126.7052,
    providerLocationId: 'legacy:incheon',
  },
  jeju: {
    ...LEGACY_WEATHER_LOCATIONS.jeju,
    latitude: 33.4996,
    longitude: 126.5312,
    providerLocationId: 'legacy:jeju',
  },
  seoul: {
    ...LEGACY_WEATHER_LOCATIONS.seoul,
    latitude: 37.5665,
    longitude: 126.978,
    providerLocationId: 'legacy:seoul',
  },
  ulsan: {
    ...LEGACY_WEATHER_LOCATIONS.ulsan,
    latitude: 35.5384,
    longitude: 129.3114,
    providerLocationId: 'legacy:ulsan',
  },
} as const satisfies Readonly<Record<WeatherCitySlug, LegacyWorldWeatherLocation>>

const LEGACY_PROVIDER_LOCATION_ALIASES: Partial<
  Readonly<Record<WeatherCitySlug, ReadonlyArray<string>>>
> = {
  jeju: ['Jeju City', '제주시'],
}

const createProviderLocationId = (providerLocationId: string): WeatherLocationId =>
  `openweather:${providerLocationId}`

const readLegacyLocation = (id: WeatherLocationId): LegacyWorldWeatherLocation | undefined => {
  const prefix = 'openweather:legacy:'
  if (!id.startsWith(prefix)) {
    return undefined
  }

  const slug = id.slice(prefix.length)
  return LEGACY_WORLD_WEATHER_LOCATIONS[slug as WeatherCitySlug]
}

const toWeatherLocation = (location: WorldWeatherLocation): WeatherLocation => ({
  country: location.country,
  id: location.id,
  ...(location.legacyCitySlug === undefined ? {} : {legacyCitySlug: location.legacyCitySlug}),
  name: location.name,
  region: location.region,
})

const normalizeLocationName = (name: string): string =>
  name
    .normalize('NFKC')
    .toLowerCase()
    .replaceAll(/[^\p{Letter}]/gu, '')

const findLegacyWorldWeatherLocation = (
  location: OpenWeatherSearchLocation,
): LegacyWorldWeatherLocation | undefined => {
  if (location.country !== LEGACY_LOCATION_PROVIDER_COUNTRY) {
    return undefined
  }

  const locationName = normalizeLocationName(location.name)
  return Object.values(LEGACY_WORLD_WEATHER_LOCATIONS).find((legacyLocation) => {
    const providerAliases = LEGACY_PROVIDER_LOCATION_ALIASES[legacyLocation.legacyCitySlug] ?? []
    const matchesName = [
      legacyLocation.legacyCitySlug,
      legacyLocation.name,
      legacyLocation.region,
      ...providerAliases,
    ].some((name) => locationName === normalizeLocationName(name))
    const isNearby =
      Math.abs(location.latitude - legacyLocation.latitude) <=
        LEGACY_LOCATION_MAXIMUM_DISTANCE_DEGREES &&
      Math.abs(location.longitude - legacyLocation.longitude) <=
        LEGACY_LOCATION_MAXIMUM_DISTANCE_DEGREES
    return matchesName && isNearby
  })
}

const getSearchWeatherLocation = (location: OpenWeatherSearchLocation): WeatherLocation => {
  const legacyLocation = findLegacyWorldWeatherLocation(location)
  return legacyLocation === undefined
    ? {
        country: location.country,
        id: createProviderLocationId(location.providerLocationId),
        name: location.name,
        region: location.region,
      }
    : toWeatherLocation(legacyLocation)
}

/** Searches and registers fixed provider coordinates for subsequent feed requests. */
export const searchWorldWeatherLocations = async (
  options: SearchOpenWeatherLocationsOptions,
  database: Database = getDatabase(),
): Promise<ReadonlyArray<WeatherLocation>> => {
  await reserveOpenWeatherRequest('search')
  const providerLocations = await searchOpenWeatherLocations(options)

  if (providerLocations.length === 0) {
    return []
  }

  const newProviderLocations = providerLocations.filter(
    (location) => findLegacyWorldWeatherLocation(location) === undefined,
  )

  if (newProviderLocations.length > 0) {
    await database
      .insert(weatherLocations)
      .values(
        newProviderLocations.map((location) => ({
          country: location.country,
          id: createProviderLocationId(location.providerLocationId),
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          providerLocationId: location.providerLocationId,
          region: location.region,
        })),
      )
      .onConflictDoUpdate({
        set: {
          country: sql`excluded.country`,
          latitude: sql`excluded.latitude`,
          longitude: sql`excluded.longitude`,
          name: sql`excluded.name`,
          region: sql`excluded.region`,
          updatedAt: sql`now()`,
        },
        target: weatherLocations.providerLocationId,
      })
  }

  return providerLocations.map(getSearchWeatherLocation)
}

/** Resolves only server-registered location IDs to fixed coordinates. */
export const getWorldWeatherLocation = async (
  id: WeatherLocationId,
  database: Database = getDatabase(),
): Promise<WorldWeatherLocation | undefined> => {
  const legacyLocation = readLegacyLocation(id)
  if (legacyLocation !== undefined) {
    return legacyLocation
  }

  const [location] = await database
    .select()
    .from(weatherLocations)
    .where(eq(weatherLocations.id, id))
    .limit(1)

  return location === undefined
    ? undefined
    : {
        country: location.country,
        id: location.id as WeatherLocationId,
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        providerLocationId: location.providerLocationId,
        region: location.region,
      }
}

export const getPublicWeatherLocation = toWeatherLocation
