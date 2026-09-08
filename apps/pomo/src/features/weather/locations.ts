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
  andong: createLegacyLocation('andong', '안동', '경상북도'),
  asan: createLegacyLocation('asan', '아산', '충청남도'),
  busan: createLegacyLocation('busan', '부산', '부산광역시'),
  changwon: createLegacyLocation('changwon', '창원', '경상남도'),
  cheonan: createLegacyLocation('cheonan', '천안', '충청남도'),
  cheongju: createLegacyLocation('cheongju', '청주', '충청북도'),
  chuncheon: createLegacyLocation('chuncheon', '춘천', '강원특별자치도'),
  chungju: createLegacyLocation('chungju', '충주', '충청북도'),
  daegu: createLegacyLocation('daegu', '대구', '대구광역시'),
  daejeon: createLegacyLocation('daejeon', '대전', '대전광역시'),
  gangneung: createLegacyLocation('gangneung', '강릉', '강원특별자치도'),
  geoje: createLegacyLocation('geoje', '거제', '경상남도'),
  gimhae: createLegacyLocation('gimhae', '김해', '경상남도'),
  goyang: createLegacyLocation('goyang', '고양', '경기도'),
  gumi: createLegacyLocation('gumi', '구미', '경상북도'),
  gunsan: createLegacyLocation('gunsan', '군산', '전북특별자치도'),
  gwangju: createLegacyLocation('gwangju', '광주', '광주광역시'),
  gyeongju: createLegacyLocation('gyeongju', '경주', '경상북도'),
  iksan: createLegacyLocation('iksan', '익산', '전북특별자치도'),
  incheon: createLegacyLocation('incheon', '인천', '인천광역시'),
  jeju: createLegacyLocation('jeju', '제주', '제주특별자치도'),
  jeonju: createLegacyLocation('jeonju', '전주', '전북특별자치도'),
  jinju: createLegacyLocation('jinju', '진주', '경상남도'),
  miryang: createLegacyLocation('miryang', '밀양', '경상남도'),
  mokpo: createLegacyLocation('mokpo', '목포', '전라남도'),
  pohang: createLegacyLocation('pohang', '포항', '경상북도'),
  sejong: createLegacyLocation('sejong', '세종', '세종특별자치시'),
  seongnam: createLegacyLocation('seongnam', '성남', '경기도'),
  seoul: createLegacyLocation('seoul', '서울', '서울특별시'),
  sokcho: createLegacyLocation('sokcho', '속초', '강원특별자치도'),
  suncheon: createLegacyLocation('suncheon', '순천', '전라남도'),
  suwon: createLegacyLocation('suwon', '수원', '경기도'),
  ulsan: createLegacyLocation('ulsan', '울산', '울산광역시'),
  wonju: createLegacyLocation('wonju', '원주', '강원특별자치도'),
  yeosu: createLegacyLocation('yeosu', '여수', '전라남도'),
  yongin: createLegacyLocation('yongin', '용인', '경기도'),
} as const satisfies Readonly<Record<WeatherCitySlug, LegacyWeatherLocation>>

export const DEFAULT_WEATHER_LOCATION = LEGACY_WEATHER_LOCATIONS.seoul
