export const WEATHER_CITY_CATALOG = [
  {names: {en: 'Seoul', ko: '서울'}, region: '서울특별시', slug: 'seoul'},
  {names: {en: 'Busan', ko: '부산'}, region: '부산광역시', slug: 'busan'},
  {names: {en: 'Daegu', ko: '대구'}, region: '대구광역시', slug: 'daegu'},
  {names: {en: 'Incheon', ko: '인천'}, region: '인천광역시', slug: 'incheon'},
  {names: {en: 'Gwangju', ko: '광주'}, region: '광주광역시', slug: 'gwangju'},
  {names: {en: 'Daejeon', ko: '대전'}, region: '대전광역시', slug: 'daejeon'},
  {names: {en: 'Ulsan', ko: '울산'}, region: '울산광역시', slug: 'ulsan'},
  {names: {en: 'Jeju', ko: '제주'}, region: '제주특별자치도', slug: 'jeju'},
  {names: {en: 'Sejong', ko: '세종'}, region: '세종특별자치시', slug: 'sejong'},
  {names: {en: 'Suwon', ko: '수원'}, region: '경기도', slug: 'suwon'},
  {names: {en: 'Seongnam', ko: '성남'}, region: '경기도', slug: 'seongnam'},
  {names: {en: 'Goyang', ko: '고양'}, region: '경기도', slug: 'goyang'},
  {names: {en: 'Yongin', ko: '용인'}, region: '경기도', slug: 'yongin'},
  {names: {en: 'Chuncheon', ko: '춘천'}, region: '강원특별자치도', slug: 'chuncheon'},
  {names: {en: 'Wonju', ko: '원주'}, region: '강원특별자치도', slug: 'wonju'},
  {names: {en: 'Gangneung', ko: '강릉'}, region: '강원특별자치도', slug: 'gangneung'},
  {names: {en: 'Sokcho', ko: '속초'}, region: '강원특별자치도', slug: 'sokcho'},
  {names: {en: 'Cheongju', ko: '청주'}, region: '충청북도', slug: 'cheongju'},
  {names: {en: 'Chungju', ko: '충주'}, region: '충청북도', slug: 'chungju'},
  {names: {en: 'Cheonan', ko: '천안'}, region: '충청남도', slug: 'cheonan'},
  {names: {en: 'Asan', ko: '아산'}, region: '충청남도', slug: 'asan'},
  {names: {en: 'Jeonju', ko: '전주'}, region: '전북특별자치도', slug: 'jeonju'},
  {names: {en: 'Iksan', ko: '익산'}, region: '전북특별자치도', slug: 'iksan'},
  {names: {en: 'Gunsan', ko: '군산'}, region: '전북특별자치도', slug: 'gunsan'},
  {names: {en: 'Mokpo', ko: '목포'}, region: '전라남도', slug: 'mokpo'},
  {names: {en: 'Yeosu', ko: '여수'}, region: '전라남도', slug: 'yeosu'},
  {names: {en: 'Suncheon', ko: '순천'}, region: '전라남도', slug: 'suncheon'},
  {names: {en: 'Pohang', ko: '포항'}, region: '경상북도', slug: 'pohang'},
  {names: {en: 'Gyeongju', ko: '경주'}, region: '경상북도', slug: 'gyeongju'},
  {names: {en: 'Gumi', ko: '구미'}, region: '경상북도', slug: 'gumi'},
  {names: {en: 'Andong', ko: '안동'}, region: '경상북도', slug: 'andong'},
  {names: {en: 'Changwon', ko: '창원'}, region: '경상남도', slug: 'changwon'},
  {names: {en: 'Gimhae', ko: '김해'}, region: '경상남도', slug: 'gimhae'},
  {names: {en: 'Jinju', ko: '진주'}, region: '경상남도', slug: 'jinju'},
  {names: {en: 'Geoje', ko: '거제'}, region: '경상남도', slug: 'geoje'},
  {names: {en: 'Miryang', ko: '밀양'}, region: '경상남도', slug: 'miryang'},
] as const

export type WeatherCitySlug = (typeof WEATHER_CITY_CATALOG)[number]['slug']

export const WEATHER_CITY_SLUGS: ReadonlyArray<WeatherCitySlug> = WEATHER_CITY_CATALOG.map(
  (city) => city.slug,
)

export const WEATHER_CITIES_BY_SLUG = Object.fromEntries(
  WEATHER_CITY_CATALOG.map((city) => [city.slug, city]),
) as Readonly<Record<WeatherCitySlug, (typeof WEATHER_CITY_CATALOG)[number]>>
