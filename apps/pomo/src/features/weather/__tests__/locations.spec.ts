/** @vitest-environment node */
import {expect, it} from 'vitest'
import {DEFAULT_WEATHER_LOCATION, LEGACY_WEATHER_LOCATIONS} from '../locations'

const EXPECTED_LOCATIONS = [
  ['andong', '안동', '경상북도'],
  ['asan', '아산', '충청남도'],
  ['busan', '부산', '부산광역시'],
  ['changwon', '창원', '경상남도'],
  ['cheonan', '천안', '충청남도'],
  ['cheongju', '청주', '충청북도'],
  ['chuncheon', '춘천', '강원특별자치도'],
  ['chungju', '충주', '충청북도'],
  ['daegu', '대구', '대구광역시'],
  ['daejeon', '대전', '대전광역시'],
  ['gangneung', '강릉', '강원특별자치도'],
  ['geoje', '거제', '경상남도'],
  ['gimhae', '김해', '경상남도'],
  ['goyang', '고양', '경기도'],
  ['gumi', '구미', '경상북도'],
  ['gunsan', '군산', '전북특별자치도'],
  ['gwangju', '광주', '광주광역시'],
  ['gyeongju', '경주', '경상북도'],
  ['iksan', '익산', '전북특별자치도'],
  ['incheon', '인천', '인천광역시'],
  ['jeju', '제주', '제주특별자치도'],
  ['jeonju', '전주', '전북특별자치도'],
  ['jinju', '진주', '경상남도'],
  ['miryang', '밀양', '경상남도'],
  ['mokpo', '목포', '전라남도'],
  ['pohang', '포항', '경상북도'],
  ['sejong', '세종', '세종특별자치시'],
  ['seongnam', '성남', '경기도'],
  ['seoul', '서울', '서울특별시'],
  ['sokcho', '속초', '강원특별자치도'],
  ['suncheon', '순천', '전라남도'],
  ['suwon', '수원', '경기도'],
  ['ulsan', '울산', '울산광역시'],
  ['wonju', '원주', '강원특별자치도'],
  ['yeosu', '여수', '전라남도'],
  ['yongin', '용인', '경기도'],
] as const

it('should preserve all legacy IDs, Korean labels, regions, and alphabetic default order', () => {
  expect(Object.values(LEGACY_WEATHER_LOCATIONS)).toEqual(
    EXPECTED_LOCATIONS.map(([slug, name, region]) => ({
      country: '대한민국',
      id: `openweather:legacy:${slug}`,
      legacyCitySlug: slug,
      name,
      region,
    })),
  )
  expect(DEFAULT_WEATHER_LOCATION).toBe(LEGACY_WEATHER_LOCATIONS.seoul)
})
