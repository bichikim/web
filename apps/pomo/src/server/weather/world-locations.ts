import {eq, inArray, sql} from 'drizzle-orm'

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
import {WEATHER_COORDINATES} from './coordinates'
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
const LEGACY_ID_DECIMALS = 4

const LEGACY_WORLD_WEATHER_LOCATIONS = Object.fromEntries(
  Object.values(LEGACY_WEATHER_LOCATIONS).map((location) => {
    const coordinates = WEATHER_COORDINATES[location.legacyCitySlug]
    return [
      location.legacyCitySlug,
      {
        ...location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        providerLocationId: `legacy:${location.legacyCitySlug}`,
      } satisfies LegacyWorldWeatherLocation,
    ]
  }),
) as Readonly<Record<WeatherCitySlug, LegacyWorldWeatherLocation>>

const LEGACY_PROVIDER_LOCATION_ALIASES: Partial<
  Readonly<Record<WeatherCitySlug, ReadonlyArray<string>>>
> = {
  jeju: ['Jeju City', '제주시'],
}

const createProviderLocationId = (providerLocationId: string): WeatherLocationId =>
  `openweather:${providerLocationId}`

/** 기존에 저장한 좌표 ID를 찾을 때만 4자리 표현을 사용한다. 신규 ID의 정밀도는 줄이지 않는다. */
const legacyCoordinatesKey = (
  location: Pick<OpenWeatherSearchLocation, 'latitude' | 'longitude'>,
): string =>
  `${location.latitude.toFixed(LEGACY_ID_DECIMALS)},${location.longitude.toFixed(LEGACY_ID_DECIMALS)}`

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

/** 같은 좌표로 등록된 이전 ID만 유지해 저장된 사용자 설정의 연결을 보존한다. */
const preserveLegacyIds = async (
  locations: ReadonlyArray<OpenWeatherSearchLocation>,
  database: Database,
): Promise<ReadonlyArray<OpenWeatherSearchLocation>> => {
  const candidateLocations = locations.filter(
    (location) => findLegacyWorldWeatherLocation(location) === undefined,
  )
  if (candidateLocations.length === 0) {
    return locations
  }

  const legacyIds = Array.from(new Set(candidateLocations.map(legacyCoordinatesKey)))
  const storedLocations = await database
    .select({
      latitude: weatherLocations.latitude,
      longitude: weatherLocations.longitude,
      providerLocationId: weatherLocations.providerLocationId,
    })
    .from(weatherLocations)
    .where(inArray(weatherLocations.providerLocationId, legacyIds))
    .limit(legacyIds.length)
  const storedById = new Map(
    storedLocations.map((location) => [location.providerLocationId, location]),
  )

  return locations.map((location) => {
    if (findLegacyWorldWeatherLocation(location) !== undefined) {
      return location
    }

    const storedLocation = storedById.get(legacyCoordinatesKey(location))
    if (
      storedLocation === undefined ||
      storedLocation.latitude !== location.latitude ||
      storedLocation.longitude !== location.longitude
    ) {
      return location
    }

    return {...location, providerLocationId: storedLocation.providerLocationId}
  })
}

const getSearchWeatherLocation = (location: OpenWeatherSearchLocation): WeatherLocation => {
  const legacyLocation = findLegacyWorldWeatherLocation(location)
  return legacyLocation === undefined
    ? {
        country: location.country,
        id: createProviderLocationId(location.providerLocationId),
        name: location.name,
        ...(location.names === undefined ? {} : {names: location.names}),
        region: location.region,
      }
    : toWeatherLocation(legacyLocation)
}

const deduplicateProviderLocations = (
  locations: ReadonlyArray<OpenWeatherSearchLocation>,
): ReadonlyArray<OpenWeatherSearchLocation> => {
  const seenIds = new Set<string>()

  return locations.filter((location) => {
    if (seenIds.has(location.providerLocationId)) {
      return false
    }

    seenIds.add(location.providerLocationId)
    return true
  })
}

/** 검색한 위치의 좌표를 등록하되, 같은 위치의 기존 저장 ID는 유지한다. */
export const searchWorldWeatherLocations = async (
  options: SearchOpenWeatherLocationsOptions,
  database: Database = getDatabase(),
): Promise<ReadonlyArray<WeatherLocation>> => {
  await reserveOpenWeatherRequest('search')
  const providerLocations = deduplicateProviderLocations(await searchOpenWeatherLocations(options))

  if (providerLocations.length === 0) {
    return []
  }

  const resolvedLocations = await preserveLegacyIds(providerLocations, database)
  const newProviderLocations = resolvedLocations.filter(
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

  return resolvedLocations.map(getSearchWeatherLocation)
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
