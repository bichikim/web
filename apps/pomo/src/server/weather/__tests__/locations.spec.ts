import {expect, it} from 'vitest'

import {WEATHER_CITY_SLUGS} from 'src/features/weather'
import {getWeatherLocation} from '../locations'

it('should return the configured grid location for every supported city', () => {
  expect(getWeatherLocation('seoul')).toEqual({
    gridX: 60,
    gridY: 127,
    label: '서울',
    slug: 'seoul',
  })
  expect(getWeatherLocation('jeju')).toEqual({
    gridX: 52,
    gridY: 38,
    label: '제주',
    slug: 'jeju',
  })
  expect(WEATHER_CITY_SLUGS).toContain('miryang')
  expect(getWeatherLocation('miryang')).toEqual({
    gridX: 92,
    gridY: 83,
    label: '밀양',
    slug: 'miryang',
  })
})
it('should preserve all grid coordinates and labels at the public lookup', () => {
  const expected = [
    ['seoul', 60, 127, '서울'],
    ['busan', 98, 76, '부산'],
    ['daegu', 89, 90, '대구'],
    ['incheon', 55, 124, '인천'],
    ['gwangju', 58, 74, '광주'],
    ['daejeon', 67, 100, '대전'],
    ['ulsan', 102, 84, '울산'],
    ['jeju', 52, 38, '제주'],
    ['sejong', 66, 103, '세종'],
    ['suwon', 60, 121, '수원'],
    ['seongnam', 62, 124, '성남'],
    ['goyang', 57, 128, '고양'],
    ['yongin', 64, 119, '용인'],
    ['chuncheon', 73, 134, '춘천'],
    ['wonju', 76, 122, '원주'],
    ['gangneung', 92, 131, '강릉'],
    ['sokcho', 87, 141, '속초'],
    ['cheongju', 69, 107, '청주'],
    ['chungju', 76, 114, '충주'],
    ['cheonan', 63, 110, '천안'],
    ['asan', 60, 110, '아산'],
    ['jeonju', 63, 89, '전주'],
    ['iksan', 60, 91, '익산'],
    ['gunsan', 56, 92, '군산'],
    ['mokpo', 50, 67, '목포'],
    ['yeosu', 73, 66, '여수'],
    ['suncheon', 70, 70, '순천'],
    ['pohang', 102, 94, '포항'],
    ['gyeongju', 100, 91, '경주'],
    ['gumi', 84, 96, '구미'],
    ['andong', 91, 106, '안동'],
    ['changwon', 90, 77, '창원'],
    ['gimhae', 95, 77, '김해'],
    ['jinju', 81, 75, '진주'],
    ['geoje', 90, 69, '거제'],
    ['miryang', 92, 83, '밀양'],
  ] as const
  expect(WEATHER_CITY_SLUGS.map(getWeatherLocation)).toEqual(
    expected.map(([slug, gridX, gridY, label]) => ({gridX, gridY, label, slug})),
  )
})
