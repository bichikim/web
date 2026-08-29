// oxlint-disable eslint/no-magic-numbers, eslint-js/camelcase -- KMA grids, timestamps, and provider condition codes are fixed external contracts.

const KMA_ORIGIN = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0'
const OPENWEATHER_ORIGIN = 'https://api.openweathermap.org/data/2.5/weather'
const KOREA_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1_000
const MAX_TEMPERATURE_DIFFERENCE = 3
const MAX_HUMIDITY_DIFFERENCE = 20
const MAX_OBSERVATION_TIME_DIFFERENCE_MINUTES = 90

const locations = [
  {gridX: 60, gridY: 127, latitude: 37.5665, longitude: 126.978, name: '서울'},
  {gridX: 98, gridY: 76, latitude: 35.1796, longitude: 129.0756, name: '부산'},
  {gridX: 89, gridY: 90, latitude: 35.8714, longitude: 128.6014, name: '대구'},
  {gridX: 55, gridY: 124, latitude: 37.4563, longitude: 126.7052, name: '인천'},
  {gridX: 58, gridY: 74, latitude: 35.1595, longitude: 126.8526, name: '광주'},
  {gridX: 67, gridY: 100, latitude: 36.3504, longitude: 127.3845, name: '대전'},
  {gridX: 102, gridY: 84, latitude: 35.5384, longitude: 129.3114, name: '울산'},
  {gridX: 52, gridY: 38, latitude: 33.4996, longitude: 126.5312, name: '제주'},
]

const requireEnvironment = (name) => {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

const pad = (value) => value.toString().padStart(2, '0')

const createKmaBaseTime = (now, availableMinute, baseMinute) => {
  const availableAt = new Date(now)
  if (availableAt.getUTCMinutes() < availableMinute) {
    availableAt.setUTCHours(availableAt.getUTCHours() - 1)
  }
  const koreaClock = new Date(availableAt.getTime() + KOREA_OFFSET_MILLISECONDS)
  return {
    date: `${koreaClock.getUTCFullYear()}${pad(koreaClock.getUTCMonth() + 1)}${pad(koreaClock.getUTCDate())}`,
    time: `${pad(koreaClock.getUTCHours())}${baseMinute}`,
  }
}

const parseKmaDateTime = (date, time) =>
  new Date(
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(4, 6)) - 1,
      Number(date.slice(6, 8)),
      Number(time.slice(0, 2)) - 9,
      Number(time.slice(2, 4)),
    ),
  )

const fetchJson = async (url, label) => {
  const response = await fetch(url, {
    headers: {accept: 'application/json'},
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}`)
  }
  return response.json()
}

const fetchKmaItems = async (operation, baseTime, location, serviceKey) => {
  const url = new URL(`${KMA_ORIGIN}/${operation}`)
  url.search = new URLSearchParams({
    base_date: baseTime.date,
    base_time: baseTime.time,
    dataType: 'JSON',
    numOfRows: '1000',
    nx: location.gridX.toString(),
    ny: location.gridY.toString(),
    pageNo: '1',
    ServiceKey: serviceKey,
  }).toString()
  const value = await fetchJson(url, `KMA ${operation}`)
  const code = String(value?.response?.header?.resultCode)
  if (code !== '0' && code !== '00') {
    throw new Error(`KMA ${operation} failed: ${code} ${value?.response?.header?.resultMsg ?? ''}`)
  }
  const items = value?.response?.body?.items?.item
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`KMA ${operation} returned no items`)
  }
  return items
}

const numberValue = (value) => {
  const number = Number.parseFloat(String(value))
  return Number.isFinite(number) && Math.abs(number) < 900 ? number : null
}

const kmaPrecipitation = (value) => {
  const code = Math.trunc(numberValue(value) ?? -1)
  if (code === 0) {
    return 'none'
  }
  if (code === 1 || code === 5) {
    return 'rain'
  }
  if (code === 2 || code === 6) {
    return 'mixed'
  }
  if (code === 3 || code === 7) {
    return 'snow'
  }
  throw new Error(`KMA returned unsupported PTY ${String(value)}`)
}

const kmaSky = (value) => {
  const code = Math.trunc(numberValue(value) ?? -1)
  if (code === 1) {
    return 'clear'
  }
  if (code === 3) {
    return 'cloudy'
  }
  if (code === 4) {
    return 'overcast'
  }
  throw new Error(`KMA returned unsupported SKY ${String(value)}`)
}

const openWeatherCondition = (code) => {
  if (code === 800) {
    return {precipitation: 'none', sky: 'clear'}
  }
  if (code === 801 || code === 802 || (code >= 700 && code < 800)) {
    return {precipitation: 'none', sky: 'cloudy'}
  }
  if (code === 803 || code === 804) {
    return {precipitation: 'none', sky: 'overcast'}
  }
  if ([511, 611, 612, 613, 615, 616].includes(code)) {
    return {precipitation: 'mixed', sky: null}
  }
  if (code >= 600 && code < 700) {
    return {precipitation: 'snow', sky: null}
  }
  if (code >= 200 && code < 600) {
    return {precipitation: 'rain', sky: null}
  }
  return {precipitation: 'none', sky: null}
}

const readKma = async (location, now, serviceKey) => {
  const observationBase = createKmaBaseTime(now, 10, '00')
  const skyBase = createKmaBaseTime(now, 45, '30')
  const [observations, forecasts] = await Promise.all([
    fetchKmaItems('getUltraSrtNcst', observationBase, location, serviceKey),
    fetchKmaItems('getUltraSrtFcst', skyBase, location, serviceKey),
  ])
  const observationValue = (category) =>
    observations.find((item) => item.category === category)?.obsrValue
  const [nearestSky] = forecasts
    .filter((item) => item.category === 'SKY' && item.fcstDate && item.fcstTime)
    .sort(
      (left, right) =>
        Math.abs(parseKmaDateTime(left.fcstDate, left.fcstTime).getTime() - now.getTime()) -
        Math.abs(parseKmaDateTime(right.fcstDate, right.fcstTime).getTime() - now.getTime()),
    )
  if (!nearestSky) {
    throw new Error('KMA forecast returned no SKY item')
  }
  return {
    humidity: numberValue(observationValue('REH')),
    observedAt: parseKmaDateTime(observationBase.date, observationBase.time),
    precipitation: kmaPrecipitation(observationValue('PTY')),
    sky: kmaSky(nearestSky.fcstValue),
    temperature: numberValue(observationValue('T1H')),
  }
}

const readOpenWeather = async (location, apiKey) => {
  const url = new URL(OPENWEATHER_ORIGIN)
  url.search = new URLSearchParams({
    appid: apiKey,
    lat: location.latitude.toString(),
    lon: location.longitude.toString(),
    units: 'metric',
  }).toString()
  const value = await fetchJson(url, 'OpenWeather current')
  if (
    !Number.isFinite(value?.weather?.[0]?.id) ||
    !Number.isFinite(value?.dt) ||
    !Number.isFinite(value?.main?.temp) ||
    !Number.isFinite(value?.main?.humidity)
  ) {
    throw new Error('OpenWeather current returned an invalid response')
  }
  return {
    condition: openWeatherCondition(value.weather[0].id),
    humidity: value.main.humidity,
    observedAt: new Date(value.dt * 1_000),
    temperature: value.main.temp,
  }
}

const matchesCondition = (kma, openWeather) =>
  kma.precipitation === 'none'
    ? openWeather.condition.precipitation === 'none' && openWeather.condition.sky === kma.sky
    : openWeather.condition.precipitation === kma.precipitation

const compareLocation = async (location, now, keys) => {
  const [kma, openWeather] = await Promise.all([
    readKma(location, now, keys.kma),
    readOpenWeather(location, keys.openWeather),
  ])
  if (
    kma.temperature === null ||
    kma.humidity === null ||
    !Number.isFinite(openWeather.temperature) ||
    !Number.isFinite(openWeather.humidity)
  ) {
    throw new Error('A provider returned incomplete temperature or humidity data')
  }
  const temperatureDifference = Math.abs(kma.temperature - openWeather.temperature)
  const humidityDifference = Math.abs(kma.humidity - openWeather.humidity)
  const observationTimeDifferenceMinutes = Math.round(
    Math.abs(kma.observedAt.getTime() - openWeather.observedAt.getTime()) / 60_000,
  )
  const conditionMatches = matchesCondition(kma, openWeather)
  const passed =
    temperatureDifference <= MAX_TEMPERATURE_DIFFERENCE &&
    humidityDifference <= MAX_HUMIDITY_DIFFERENCE &&
    observationTimeDifferenceMinutes <= MAX_OBSERVATION_TIME_DIFFERENCE_MINUTES &&
    conditionMatches
  return {
    city: location.name,
    condition: conditionMatches ? 'PASS' : 'REVIEW',
    humidityDelta: humidityDifference,
    observedAtDeltaMinutes: observationTimeDifferenceMinutes,
    result: passed ? 'PASS' : 'REVIEW',
    temperatureDelta: temperatureDifference.toFixed(1),
  }
}

const main = async () => {
  const keys = {
    kma: requireEnvironment('KMA_SERVICE_KEY'),
    openWeather: requireEnvironment('OPENWEATHER_API_KEY'),
  }
  const now = new Date()
  const results = await Promise.all(
    locations.map(async (location) => {
      try {
        return await compareLocation(location, now, keys)
      } catch (error) {
        return {
          city: location.name,
          error: error instanceof Error ? error.message : String(error),
          result: 'ERROR',
        }
      }
    }),
  )
  console.table(results)
  const failures = results.filter((result) => result.result !== 'PASS')
  if (failures.length > 0) {
    throw new Error(`${failures.length} of ${locations.length} Korean cities require review`)
  }
}

await main()
