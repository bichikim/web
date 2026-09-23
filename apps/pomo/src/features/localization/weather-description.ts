import {getLocale, type Locale} from '@paraglide/runtime'
import {LEGACY_WEATHER_LOCATIONS, type WeatherLocation} from '../weather'

const KOREAN_REGIONS = [
  ['서울특별시', 'Seoul'],
  ['부산광역시', 'Busan'],
  ['대구광역시', 'Daegu'],
  ['인천광역시', 'Incheon'],
  ['광주광역시', 'Gwangju'],
  ['대전광역시', 'Daejeon'],
  ['울산광역시', 'Ulsan'],
  ['세종특별자치시', 'Sejong'],
  ['경기도', 'Gyeonggi-do', 'Gyeonggi'],
  ['강원특별자치도', 'Gangwon-do', 'Gangwon', '강원도'],
  ['충청북도', 'Chungcheongbuk-do', 'North Chungcheong'],
  ['충청남도', 'Chungcheongnam-do', 'South Chungcheong'],
  ['전북특별자치도', 'Jeonbuk-do', 'Jeollabuk-do', 'North Jeolla', '전라북도'],
  ['전라남도', 'Jeollanam-do', 'South Jeolla'],
  ['경상북도', 'Gyeongsangbuk-do', 'North Gyeongsang'],
  ['경상남도', 'Gyeongsangnam-do', 'South Gyeongsang'],
  ['제주특별자치도', 'Jeju', 'Jeju-do'],
] as const

const COUNTRY_LABELS = {
  en: new Intl.DisplayNames(['en'], {type: 'region'}),
  ko: new Intl.DisplayNames(['ko'], {type: 'region'}),
}

const normalizeRegion = (value: string): string =>
  value.toLowerCase().replaceAll(/[^\p{Letter}]/gu, '')

const getCountryCode = (country: string): string | undefined => {
  const value = country.trim()
  if (/^[a-z]{2}$/iu.test(value)) {
    return value.toUpperCase()
  }
  // Legacy preferences may contain a display name instead of the provider's ISO code.
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (const first of letters) {
    for (const second of letters) {
      const code = `${first}${second}`
      if (
        [COUNTRY_LABELS.en.of(code), COUNTRY_LABELS.ko.of(code)].some(
          (label) => label?.toLowerCase() === value.toLowerCase(),
        )
      ) {
        return code
      }
    }
  }
  return undefined
}

const getLocationRegion = (location: WeatherLocation, countryCode: string | undefined): string => {
  if (location.legacyCitySlug !== undefined) {
    return LEGACY_WEATHER_LOCATIONS[location.legacyCitySlug].region
  }
  const region = location.region.trim()
  if (region !== '' || countryCode !== 'KR') {
    return region
  }
  const names = [location.name, location.names?.en, location.names?.ko]
    .filter((name): name is string => name !== undefined)
    .map(normalizeRegion)
  const city = Object.values(LEGACY_WEATHER_LOCATIONS).find((candidate) =>
    [
      candidate.name,
      `${candidate.name}시`,
      candidate.legacyCitySlug,
      `${candidate.legacyCitySlug}-si`,
    ].some((name) => names.includes(normalizeRegion(name))),
  )
  return city?.region ?? region
}

/** Formats region and country names for the weather city selector. */
export const getWeatherLocationDescription = (
  location: WeatherLocation,
  locale: Locale = getLocale(),
): string => {
  const countryCode =
    location.legacyCitySlug === undefined ? getCountryCode(location.country) : 'KR'
  const region = getLocationRegion(location, countryCode)
  const translated =
    countryCode === 'KR'
      ? KOREAN_REGIONS.find((aliases) =>
          aliases.some((alias) => normalizeRegion(alias) === normalizeRegion(region)),
        )
      : undefined
  const english = [
    translated?.[1] ?? region,
    countryCode === undefined ? location.country : COUNTRY_LABELS.en.of(countryCode),
  ]
    .filter(Boolean)
    .join(' · ')
  if (locale !== 'ko') {
    return english
  }
  const korean = [
    translated?.[0] ?? region,
    countryCode === undefined ? location.country : COUNTRY_LABELS.ko.of(countryCode),
  ]
    .filter(Boolean)
    .join(' · ')
  return korean === english ? english : `${korean} / ${english}`
}
