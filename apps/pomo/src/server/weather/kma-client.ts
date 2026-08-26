import 'server-only'

import {z} from 'zod'

import type {WeatherPrecipitation, WeatherSky} from 'src/features/weather'
import {getKmaServiceKey, type WeatherEnvironment} from './environment'
import {type KmaBaseTime, parseKmaDateTime} from './kma-time'

const KMA_API_ORIGIN = 'https://apis.data.go.kr'
const KMA_SERVICE_PATH = '/1360000/VilageFcstInfoService_2.0'
const KMA_RESULT_CODES = new Set(['0', '00'])
const REQUEST_TIMEOUT_MS = 10_000
const MISSING_VALUE_BOUNDARY = 900
const KMA_DATE_LENGTH = 8
const KMA_TIME_LENGTH = 4
const PRECIPITATION_NONE = 0
const PRECIPITATION_RAIN = 1
const PRECIPITATION_MIXED = 2
const PRECIPITATION_SNOW = 3
const PRECIPITATION_RAIN_DROPS = 5
const PRECIPITATION_MIXED_DROPS = 6
const PRECIPITATION_SNOW_DROPS = 7
const SKY_CLEAR = 1
const SKY_CLOUDY = 3
const SKY_OVERCAST = 4

export interface KmaLocation {
  readonly gridX: number
  readonly gridY: number
}

export interface WeatherObservationInput {
  readonly humidityPercent: number | null
  readonly observedAt: Date
  readonly precipitation: WeatherPrecipitation
  readonly precipitationMillimeters: number | null
  readonly sourceIssuedAt: Date
  readonly temperatureCelsius: number | null
  readonly windSpeedMetersPerSecond: number | null
}

const kmaItemSchema = z.object({
  baseDate: z.string().length(KMA_DATE_LENGTH),
  baseTime: z.string().length(KMA_TIME_LENGTH),
  category: z.string().min(1),
  fcstDate: z.string().length(KMA_DATE_LENGTH).optional(),
  fcstTime: z.string().length(KMA_TIME_LENGTH).optional(),
  fcstValue: z.union([z.string(), z.number()]).optional(),
  nx: z.number(),
  ny: z.number(),
  obsrValue: z.union([z.string(), z.number()]).optional(),
})

const kmaResponseSchema = z.object({
  response: z.object({
    body: z
      .object({
        items: z.object({item: z.array(kmaItemSchema)}),
      })
      .optional(),
    header: z.object({
      resultCode: z.union([z.string(), z.number()]),
      resultMsg: z.string(),
    }),
  }),
})

type KmaItem = z.infer<typeof kmaItemSchema>
type KmaValue = KmaItem['fcstValue'] | KmaItem['obsrValue']

const parseKmaNumber = (value: KmaValue): number | null => {
  if (value === undefined || value === null || value === '' || value === '-') {
    return null
  }

  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)

  if (
    !Number.isFinite(parsed) ||
    parsed >= MISSING_VALUE_BOUNDARY ||
    parsed <= -MISSING_VALUE_BOUNDARY
  ) {
    return null
  }

  return parsed
}

const parseKmaInteger = (value: KmaValue): number | null => {
  const parsed = parseKmaNumber(value)
  return parsed === null ? null : Math.trunc(parsed)
}

const parsePrecipitation = (value: KmaValue): WeatherPrecipitation => {
  switch (parseKmaInteger(value)) {
    case PRECIPITATION_NONE:
      return 'none'
    case PRECIPITATION_RAIN:
    case PRECIPITATION_RAIN_DROPS:
      return 'rain'
    case PRECIPITATION_MIXED:
    case PRECIPITATION_MIXED_DROPS:
      return 'mixed'
    case PRECIPITATION_SNOW:
    case PRECIPITATION_SNOW_DROPS:
      return 'snow'
    default:
      throw new Error('KMA observation contained an unsupported PTY value')
  }
}

const parseSky = (value: KmaValue): WeatherSky | null => {
  switch (parseKmaInteger(value)) {
    case SKY_CLEAR:
      return 'clear'
    case SKY_CLOUDY:
      return 'cloudy'
    case SKY_OVERCAST:
      return 'overcast'
    default:
      return null
  }
}

const createKmaUrl = (
  operation: 'getUltraSrtFcst' | 'getUltraSrtNcst',
  baseTime: {readonly date: string; readonly time: string},
  location: KmaLocation,
  serviceKey: string,
): URL => {
  const url = new URL(`${KMA_SERVICE_PATH}/${operation}`, KMA_API_ORIGIN)
  const query = new URLSearchParams({
    dataType: 'JSON',
    numOfRows: '1000',
    nx: location.gridX.toString(),
    ny: location.gridY.toString(),
    pageNo: '1',
  })
  query.set('ServiceKey', serviceKey)
  query.set('base_date', baseTime.date)
  query.set('base_time', baseTime.time)
  url.search = query.toString()
  return url
}

const fetchKmaItems = async (url: URL, fetcher: typeof fetch): Promise<ReadonlyArray<KmaItem>> => {
  const response = await fetcher(url, {
    headers: {Accept: 'application/json'},
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`KMA request failed with HTTP ${response.status}`)
  }

  const parsed = kmaResponseSchema.parse(await response.json())
  const resultCode = String(parsed.response.header.resultCode)

  if (!KMA_RESULT_CODES.has(resultCode)) {
    throw new Error(`KMA request failed: ${resultCode} ${parsed.response.header.resultMsg}`)
  }

  if (parsed.response.body === undefined) {
    throw new Error('KMA response contained no body')
  }

  return parsed.response.body.items.item
}

const findItem = (items: ReadonlyArray<KmaItem>, category: string): KmaItem | undefined =>
  items.find((item) => item.category === category)

const assertRequestedInput = (
  items: ReadonlyArray<KmaItem>,
  requestedBaseTime: KmaBaseTime,
  requestedLocation: KmaLocation,
): void => {
  if (
    items.length === 0 ||
    items.some(
      (item) =>
        item.baseDate !== requestedBaseTime.date ||
        item.baseTime !== requestedBaseTime.time ||
        item.nx !== requestedLocation.gridX ||
        item.ny !== requestedLocation.gridY,
    )
  ) {
    throw new Error('KMA response input did not match the requested time and location')
  }
}

const parseObservation = (items: ReadonlyArray<KmaItem>): WeatherObservationInput => {
  const firstItem = items[0]!

  const sourceIssuedAt = parseKmaDateTime(firstItem.baseDate, firstItem.baseTime)
  const value = (category: string) => findItem(items, category)?.obsrValue

  return {
    humidityPercent: parseKmaNumber(value('REH')),
    observedAt: sourceIssuedAt,
    precipitation: parsePrecipitation(value('PTY')),
    precipitationMillimeters: parseKmaNumber(value('RN1')),
    sourceIssuedAt,
    temperatureCelsius: parseKmaNumber(value('T1H')),
    windSpeedMetersPerSecond: parseKmaNumber(value('WSD')),
  }
}

const parseNearestSky = (items: ReadonlyArray<KmaItem>, targetTime: Date): WeatherSky => {
  const skyItems = items
    .filter(
      (item) =>
        item.category === 'SKY' && item.fcstDate !== undefined && item.fcstTime !== undefined,
    )
    .sort((left, right) => {
      const leftTime = parseKmaDateTime(left.fcstDate!, left.fcstTime!).getTime()
      const rightTime = parseKmaDateTime(right.fcstDate!, right.fcstTime!).getTime()
      return Math.abs(leftTime - targetTime.getTime()) - Math.abs(rightTime - targetTime.getTime())
    })
  const [nearestSky] = skyItems

  if (nearestSky === undefined) {
    throw new Error('KMA forecast response contained no SKY value')
  }

  const sky = parseSky(nearestSky.fcstValue)

  if (sky === null) {
    throw new Error('KMA forecast contained an unsupported SKY value')
  }

  return sky
}

export interface FetchKmaObservationOptions {
  readonly baseTime: KmaBaseTime
  readonly environment?: WeatherEnvironment
  readonly fetcher?: typeof fetch
  readonly location: KmaLocation
}

/** Fetches one exact KMA observation request. */
export const fetchKmaObservation = async (
  options: FetchKmaObservationOptions,
): Promise<WeatherObservationInput> => {
  const fetcher = options.fetcher ?? fetch
  const serviceKey = getKmaServiceKey(options.environment)
  const items = await fetchKmaItems(
    createKmaUrl('getUltraSrtNcst', options.baseTime, options.location, serviceKey),
    fetcher,
  )
  assertRequestedInput(items, options.baseTime, options.location)

  return parseObservation(items)
}

export interface FetchKmaSkyOptions extends FetchKmaObservationOptions {
  readonly targetTime: Date
}

/** Fetches only the ultra-short forecast value needed to supplement the current sky state. */
export const fetchKmaSky = async (options: FetchKmaSkyOptions): Promise<WeatherSky> => {
  const fetcher = options.fetcher ?? fetch
  const serviceKey = getKmaServiceKey(options.environment)
  const items = await fetchKmaItems(
    createKmaUrl('getUltraSrtFcst', options.baseTime, options.location, serviceKey),
    fetcher,
  )
  assertRequestedInput(items, options.baseTime, options.location)

  return parseNearestSky(items, options.targetTime)
}
