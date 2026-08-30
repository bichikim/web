import type {WeatherCitySlug, WeatherLocation} from './contract'

export interface LegacyWeatherLocation extends WeatherLocation {
  readonly legacyCitySlug: WeatherCitySlug
}

const createLegacyLocation = (
  legacyCitySlug: WeatherCitySlug,
  name: string,
  region: string,
): LegacyWeatherLocation => ({
  country: '대한민국',
  id: `openweather:legacy:${legacyCitySlug}`,
  legacyCitySlug,
  name,
  region,
})

export const LEGACY_WEATHER_LOCATIONS = {
  busan: createLegacyLocation('busan', '부산', '부산광역시'),
  daegu: createLegacyLocation('daegu', '대구', '대구광역시'),
  daejeon: createLegacyLocation('daejeon', '대전', '대전광역시'),
  gwangju: createLegacyLocation('gwangju', '광주', '광주광역시'),
  incheon: createLegacyLocation('incheon', '인천', '인천광역시'),
  jeju: createLegacyLocation('jeju', '제주', '제주특별자치도'),
  seoul: createLegacyLocation('seoul', '서울', '서울특별시'),
  ulsan: createLegacyLocation('ulsan', '울산', '울산광역시'),
} as const satisfies Readonly<Record<WeatherCitySlug, LegacyWeatherLocation>>

export const DEFAULT_WEATHER_LOCATION = LEGACY_WEATHER_LOCATIONS.seoul
