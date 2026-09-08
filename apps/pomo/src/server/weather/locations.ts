import type {WeatherCitySlug} from 'src/features/weather'

export interface WeatherLocation {
  readonly gridX: number
  readonly gridY: number
  readonly label: string
  readonly slug: WeatherCitySlug
}

const WEATHER_LOCATIONS = {
  andong: {gridX: 91, gridY: 106, label: '안동', slug: 'andong'},
  asan: {gridX: 60, gridY: 110, label: '아산', slug: 'asan'},
  busan: {gridX: 98, gridY: 76, label: '부산', slug: 'busan'},
  changwon: {gridX: 90, gridY: 77, label: '창원', slug: 'changwon'},
  cheonan: {gridX: 63, gridY: 110, label: '천안', slug: 'cheonan'},
  cheongju: {gridX: 69, gridY: 107, label: '청주', slug: 'cheongju'},
  chuncheon: {gridX: 73, gridY: 134, label: '춘천', slug: 'chuncheon'},
  chungju: {gridX: 76, gridY: 114, label: '충주', slug: 'chungju'},
  daegu: {gridX: 89, gridY: 90, label: '대구', slug: 'daegu'},
  daejeon: {gridX: 67, gridY: 100, label: '대전', slug: 'daejeon'},
  gangneung: {gridX: 92, gridY: 131, label: '강릉', slug: 'gangneung'},
  geoje: {gridX: 90, gridY: 69, label: '거제', slug: 'geoje'},
  gimhae: {gridX: 95, gridY: 77, label: '김해', slug: 'gimhae'},
  goyang: {gridX: 57, gridY: 128, label: '고양', slug: 'goyang'},
  gumi: {gridX: 84, gridY: 96, label: '구미', slug: 'gumi'},
  gunsan: {gridX: 56, gridY: 92, label: '군산', slug: 'gunsan'},
  gwangju: {gridX: 58, gridY: 74, label: '광주', slug: 'gwangju'},
  gyeongju: {gridX: 100, gridY: 91, label: '경주', slug: 'gyeongju'},
  iksan: {gridX: 60, gridY: 91, label: '익산', slug: 'iksan'},
  incheon: {gridX: 55, gridY: 124, label: '인천', slug: 'incheon'},
  jeju: {gridX: 52, gridY: 38, label: '제주', slug: 'jeju'},
  jeonju: {gridX: 63, gridY: 89, label: '전주', slug: 'jeonju'},
  jinju: {gridX: 81, gridY: 75, label: '진주', slug: 'jinju'},
  miryang: {gridX: 92, gridY: 83, label: '밀양', slug: 'miryang'},
  mokpo: {gridX: 50, gridY: 67, label: '목포', slug: 'mokpo'},
  pohang: {gridX: 102, gridY: 94, label: '포항', slug: 'pohang'},
  sejong: {gridX: 66, gridY: 103, label: '세종', slug: 'sejong'},
  seongnam: {gridX: 62, gridY: 124, label: '성남', slug: 'seongnam'},
  seoul: {gridX: 60, gridY: 127, label: '서울', slug: 'seoul'},
  sokcho: {gridX: 87, gridY: 141, label: '속초', slug: 'sokcho'},
  suncheon: {gridX: 70, gridY: 70, label: '순천', slug: 'suncheon'},
  suwon: {gridX: 60, gridY: 121, label: '수원', slug: 'suwon'},
  ulsan: {gridX: 102, gridY: 84, label: '울산', slug: 'ulsan'},
  wonju: {gridX: 76, gridY: 122, label: '원주', slug: 'wonju'},
  yeosu: {gridX: 73, gridY: 66, label: '여수', slug: 'yeosu'},
  yongin: {gridX: 64, gridY: 119, label: '용인', slug: 'yongin'},
} as const satisfies Readonly<Record<WeatherCitySlug, WeatherLocation>>

export const getWeatherLocation = (slug: WeatherCitySlug): WeatherLocation =>
  WEATHER_LOCATIONS[slug]
