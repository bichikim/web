import {expect, it} from 'vitest'
import {WEATHER_CITIES_BY_SLUG, WEATHER_CITY_CATALOG, WEATHER_CITY_SLUGS} from '../catalog'

const EXPECTED_CITIES = [
  ['seoul', 'Seoul', '서울', '서울특별시'],
  ['busan', 'Busan', '부산', '부산광역시'],
  ['daegu', 'Daegu', '대구', '대구광역시'],
  ['incheon', 'Incheon', '인천', '인천광역시'],
  ['gwangju', 'Gwangju', '광주', '광주광역시'],
  ['daejeon', 'Daejeon', '대전', '대전광역시'],
  ['ulsan', 'Ulsan', '울산', '울산광역시'],
  ['jeju', 'Jeju', '제주', '제주특별자치도'],
  ['sejong', 'Sejong', '세종', '세종특별자치시'],
  ['suwon', 'Suwon', '수원', '경기도'],
  ['seongnam', 'Seongnam', '성남', '경기도'],
  ['goyang', 'Goyang', '고양', '경기도'],
  ['yongin', 'Yongin', '용인', '경기도'],
  ['chuncheon', 'Chuncheon', '춘천', '강원특별자치도'],
  ['wonju', 'Wonju', '원주', '강원특별자치도'],
  ['gangneung', 'Gangneung', '강릉', '강원특별자치도'],
  ['sokcho', 'Sokcho', '속초', '강원특별자치도'],
  ['cheongju', 'Cheongju', '청주', '충청북도'],
  ['chungju', 'Chungju', '충주', '충청북도'],
  ['cheonan', 'Cheonan', '천안', '충청남도'],
  ['asan', 'Asan', '아산', '충청남도'],
  ['jeonju', 'Jeonju', '전주', '전북특별자치도'],
  ['iksan', 'Iksan', '익산', '전북특별자치도'],
  ['gunsan', 'Gunsan', '군산', '전북특별자치도'],
  ['mokpo', 'Mokpo', '목포', '전라남도'],
  ['yeosu', 'Yeosu', '여수', '전라남도'],
  ['suncheon', 'Suncheon', '순천', '전라남도'],
  ['pohang', 'Pohang', '포항', '경상북도'],
  ['gyeongju', 'Gyeongju', '경주', '경상북도'],
  ['gumi', 'Gumi', '구미', '경상북도'],
  ['andong', 'Andong', '안동', '경상북도'],
  ['changwon', 'Changwon', '창원', '경상남도'],
  ['gimhae', 'Gimhae', '김해', '경상남도'],
  ['jinju', 'Jinju', '진주', '경상남도'],
  ['geoje', 'Geoje', '거제', '경상남도'],
  ['miryang', 'Miryang', '밀양', '경상남도'],
] as const

it('should preserve every original city name, region, and slug in order', () => {
  expect(WEATHER_CITY_CATALOG).toEqual(
    EXPECTED_CITIES.map(([slug, en, ko, region]) => ({names: {en, ko}, region, slug})),
  )
  expect(WEATHER_CITY_SLUGS).toEqual(EXPECTED_CITIES.map(([slug]) => slug))
  expect(new Set(WEATHER_CITY_SLUGS).size).toBe(36)
  expect(Object.keys(WEATHER_CITIES_BY_SLUG).sort()).toEqual([...WEATHER_CITY_SLUGS].sort())
  for (const [slug, en, ko, region] of EXPECTED_CITIES) {
    expect(WEATHER_CITIES_BY_SLUG[slug]).toEqual({names: {en, ko}, region, slug})
  }
})
