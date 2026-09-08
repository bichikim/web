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
  andong: {
    ...LEGACY_WEATHER_LOCATIONS.andong,
    latitude: 36.5684,
    longitude: 128.7294,
    providerLocationId: 'legacy:andong',
  },
  asan: {
    ...LEGACY_WEATHER_LOCATIONS.asan,
    latitude: 36.7898,
    longitude: 127.0018,
    providerLocationId: 'legacy:asan',
  },
  busan: {
    ...LEGACY_WEATHER_LOCATIONS.busan,
    latitude: 35.1796,
    longitude: 129.0756,
    providerLocationId: 'legacy:busan',
  },
  changwon: {
    ...LEGACY_WEATHER_LOCATIONS.changwon,
    latitude: 35.2281,
    longitude: 128.6811,
    providerLocationId: 'legacy:changwon',
  },
  cheonan: {
    ...LEGACY_WEATHER_LOCATIONS.cheonan,
    latitude: 36.8151,
    longitude: 127.1139,
    providerLocationId: 'legacy:cheonan',
  },
  cheongju: {
    ...LEGACY_WEATHER_LOCATIONS.cheongju,
    latitude: 36.6424,
    longitude: 127.489,
    providerLocationId: 'legacy:cheongju',
  },
  chuncheon: {
    ...LEGACY_WEATHER_LOCATIONS.chuncheon,
    latitude: 37.8813,
    longitude: 127.7298,
    providerLocationId: 'legacy:chuncheon',
  },
  chungju: {
    ...LEGACY_WEATHER_LOCATIONS.chungju,
    latitude: 36.991,
    longitude: 127.926,
    providerLocationId: 'legacy:chungju',
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
  gangneung: {
    ...LEGACY_WEATHER_LOCATIONS.gangneung,
    latitude: 37.7519,
    longitude: 128.8761,
    providerLocationId: 'legacy:gangneung',
  },
  geoje: {
    ...LEGACY_WEATHER_LOCATIONS.geoje,
    latitude: 34.8806,
    longitude: 128.6211,
    providerLocationId: 'legacy:geoje',
  },
  gimhae: {
    ...LEGACY_WEATHER_LOCATIONS.gimhae,
    latitude: 35.2285,
    longitude: 128.8894,
    providerLocationId: 'legacy:gimhae',
  },
  goyang: {
    ...LEGACY_WEATHER_LOCATIONS.goyang,
    latitude: 37.6584,
    longitude: 126.832,
    providerLocationId: 'legacy:goyang',
  },
  gumi: {
    ...LEGACY_WEATHER_LOCATIONS.gumi,
    latitude: 36.1195,
    longitude: 128.3446,
    providerLocationId: 'legacy:gumi',
  },
  gunsan: {
    ...LEGACY_WEATHER_LOCATIONS.gunsan,
    latitude: 35.9677,
    longitude: 126.7366,
    providerLocationId: 'legacy:gunsan',
  },
  gwangju: {
    ...LEGACY_WEATHER_LOCATIONS.gwangju,
    latitude: 35.1595,
    longitude: 126.8526,
    providerLocationId: 'legacy:gwangju',
  },
  gyeongju: {
    ...LEGACY_WEATHER_LOCATIONS.gyeongju,
    latitude: 35.8562,
    longitude: 129.2247,
    providerLocationId: 'legacy:gyeongju',
  },
  iksan: {
    ...LEGACY_WEATHER_LOCATIONS.iksan,
    latitude: 35.9483,
    longitude: 126.9577,
    providerLocationId: 'legacy:iksan',
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
  jeonju: {
    ...LEGACY_WEATHER_LOCATIONS.jeonju,
    latitude: 35.8242,
    longitude: 127.148,
    providerLocationId: 'legacy:jeonju',
  },
  jinju: {
    ...LEGACY_WEATHER_LOCATIONS.jinju,
    latitude: 35.1799,
    longitude: 128.1076,
    providerLocationId: 'legacy:jinju',
  },
  miryang: {
    ...LEGACY_WEATHER_LOCATIONS.miryang,
    latitude: 35.5038,
    longitude: 128.7464,
    providerLocationId: 'legacy:miryang',
  },
  mokpo: {
    ...LEGACY_WEATHER_LOCATIONS.mokpo,
    latitude: 34.8118,
    longitude: 126.3922,
    providerLocationId: 'legacy:mokpo',
  },
  pohang: {
    ...LEGACY_WEATHER_LOCATIONS.pohang,
    latitude: 36.019,
    longitude: 129.3435,
    providerLocationId: 'legacy:pohang',
  },
  sejong: {
    ...LEGACY_WEATHER_LOCATIONS.sejong,
    latitude: 36.48,
    longitude: 127.289,
    providerLocationId: 'legacy:sejong',
  },
  seongnam: {
    ...LEGACY_WEATHER_LOCATIONS.seongnam,
    latitude: 37.42,
    longitude: 127.1267,
    providerLocationId: 'legacy:seongnam',
  },
  seoul: {
    ...LEGACY_WEATHER_LOCATIONS.seoul,
    latitude: 37.5665,
    longitude: 126.978,
    providerLocationId: 'legacy:seoul',
  },
  sokcho: {
    ...LEGACY_WEATHER_LOCATIONS.sokcho,
    latitude: 38.207,
    longitude: 128.5918,
    providerLocationId: 'legacy:sokcho',
  },
  suncheon: {
    ...LEGACY_WEATHER_LOCATIONS.suncheon,
    latitude: 34.9506,
    longitude: 127.4875,
    providerLocationId: 'legacy:suncheon',
  },
  suwon: {
    ...LEGACY_WEATHER_LOCATIONS.suwon,
    latitude: 37.2636,
    longitude: 127.0286,
    providerLocationId: 'legacy:suwon',
  },
  ulsan: {
    ...LEGACY_WEATHER_LOCATIONS.ulsan,
    latitude: 35.5384,
    longitude: 129.3114,
    providerLocationId: 'legacy:ulsan',
  },
  wonju: {
    ...LEGACY_WEATHER_LOCATIONS.wonju,
    latitude: 37.3422,
    longitude: 127.9202,
    providerLocationId: 'legacy:wonju',
  },
  yeosu: {
    ...LEGACY_WEATHER_LOCATIONS.yeosu,
    latitude: 34.7604,
    longitude: 127.6622,
    providerLocationId: 'legacy:yeosu',
  },
  yongin: {
    ...LEGACY_WEATHER_LOCATIONS.yongin,
    latitude: 37.2411,
    longitude: 127.1776,
    providerLocationId: 'legacy:yongin',
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
        ...(location.names === undefined ? {} : {names: location.names}),
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
