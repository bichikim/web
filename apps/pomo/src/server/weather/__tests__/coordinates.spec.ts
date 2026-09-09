/** @vitest-environment node */
import {expect, it} from 'vitest'
import {WEATHER_CITY_SLUGS} from 'src/features/weather/contract'
import {WEATHER_COORDINATES} from '../coordinates'

const EXPECTED_COORDINATES = [
  ['seoul', 60, 127, 37.5665, 126.978],
  ['busan', 98, 76, 35.1796, 129.0756],
  ['daegu', 89, 90, 35.8714, 128.6014],
  ['incheon', 55, 124, 37.4563, 126.7052],
  ['gwangju', 58, 74, 35.1595, 126.8526],
  ['daejeon', 67, 100, 36.3504, 127.3845],
  ['ulsan', 102, 84, 35.5384, 129.3114],
  ['jeju', 52, 38, 33.4996, 126.5312],
  ['sejong', 66, 103, 36.48, 127.289],
  ['suwon', 60, 121, 37.2636, 127.0286],
  ['seongnam', 62, 124, 37.42, 127.1267],
  ['goyang', 57, 128, 37.6584, 126.832],
  ['yongin', 64, 119, 37.2411, 127.1776],
  ['chuncheon', 73, 134, 37.8813, 127.7298],
  ['wonju', 76, 122, 37.3422, 127.9202],
  ['gangneung', 92, 131, 37.7519, 128.8761],
  ['sokcho', 87, 141, 38.207, 128.5918],
  ['cheongju', 69, 107, 36.6424, 127.489],
  ['chungju', 76, 114, 36.991, 127.926],
  ['cheonan', 63, 110, 36.8151, 127.1139],
  ['asan', 60, 110, 36.7898, 127.0018],
  ['jeonju', 63, 89, 35.8242, 127.148],
  ['iksan', 60, 91, 35.9483, 126.9577],
  ['gunsan', 56, 92, 35.9677, 126.7366],
  ['mokpo', 50, 67, 34.8118, 126.3922],
  ['yeosu', 73, 66, 34.7604, 127.6622],
  ['suncheon', 70, 70, 34.9506, 127.4875],
  ['pohang', 102, 94, 36.019, 129.3435],
  ['gyeongju', 100, 91, 35.8562, 129.2247],
  ['gumi', 84, 96, 36.1195, 128.3446],
  ['andong', 91, 106, 36.5684, 128.7294],
  ['changwon', 90, 77, 35.2281, 128.6811],
  ['gimhae', 95, 77, 35.2285, 128.8894],
  ['jinju', 81, 75, 35.1799, 128.1076],
  ['geoje', 90, 69, 34.8806, 128.6211],
  ['miryang', 92, 83, 35.5038, 128.7464],
] as const

it('should preserve every original KMA grid and provider coordinate with complete membership', () => {
  expect(WEATHER_COORDINATES).toEqual(
    Object.fromEntries(
      EXPECTED_COORDINATES.map(([slug, gridX, gridY, latitude, longitude]) => [
        slug,
        {gridX, gridY, latitude, longitude},
      ]),
    ),
  )
  expect(Object.keys(WEATHER_COORDINATES).sort()).toEqual([...WEATHER_CITY_SLUGS].sort())
})
