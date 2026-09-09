import 'server-only'

import type {WeatherCitySlug} from 'src/features/weather/contract'

interface WeatherCoordinates {
  readonly gridX: number
  readonly gridY: number
  readonly latitude: number
  readonly longitude: number
}

export const WEATHER_COORDINATES = {
  andong: {gridX: 91, gridY: 106, latitude: 36.5684, longitude: 128.7294},
  asan: {gridX: 60, gridY: 110, latitude: 36.7898, longitude: 127.0018},
  busan: {gridX: 98, gridY: 76, latitude: 35.1796, longitude: 129.0756},
  changwon: {gridX: 90, gridY: 77, latitude: 35.2281, longitude: 128.6811},
  cheonan: {gridX: 63, gridY: 110, latitude: 36.8151, longitude: 127.1139},
  cheongju: {gridX: 69, gridY: 107, latitude: 36.6424, longitude: 127.489},
  chuncheon: {gridX: 73, gridY: 134, latitude: 37.8813, longitude: 127.7298},
  chungju: {gridX: 76, gridY: 114, latitude: 36.991, longitude: 127.926},
  daegu: {gridX: 89, gridY: 90, latitude: 35.8714, longitude: 128.6014},
  daejeon: {gridX: 67, gridY: 100, latitude: 36.3504, longitude: 127.3845},
  gangneung: {gridX: 92, gridY: 131, latitude: 37.7519, longitude: 128.8761},
  geoje: {gridX: 90, gridY: 69, latitude: 34.8806, longitude: 128.6211},
  gimhae: {gridX: 95, gridY: 77, latitude: 35.2285, longitude: 128.8894},
  goyang: {gridX: 57, gridY: 128, latitude: 37.6584, longitude: 126.832},
  gumi: {gridX: 84, gridY: 96, latitude: 36.1195, longitude: 128.3446},
  gunsan: {gridX: 56, gridY: 92, latitude: 35.9677, longitude: 126.7366},
  gwangju: {gridX: 58, gridY: 74, latitude: 35.1595, longitude: 126.8526},
  gyeongju: {gridX: 100, gridY: 91, latitude: 35.8562, longitude: 129.2247},
  iksan: {gridX: 60, gridY: 91, latitude: 35.9483, longitude: 126.9577},
  incheon: {gridX: 55, gridY: 124, latitude: 37.4563, longitude: 126.7052},
  jeju: {gridX: 52, gridY: 38, latitude: 33.4996, longitude: 126.5312},
  jeonju: {gridX: 63, gridY: 89, latitude: 35.8242, longitude: 127.148},
  jinju: {gridX: 81, gridY: 75, latitude: 35.1799, longitude: 128.1076},
  miryang: {gridX: 92, gridY: 83, latitude: 35.5038, longitude: 128.7464},
  mokpo: {gridX: 50, gridY: 67, latitude: 34.8118, longitude: 126.3922},
  pohang: {gridX: 102, gridY: 94, latitude: 36.019, longitude: 129.3435},
  sejong: {gridX: 66, gridY: 103, latitude: 36.48, longitude: 127.289},
  seongnam: {gridX: 62, gridY: 124, latitude: 37.42, longitude: 127.1267},
  seoul: {gridX: 60, gridY: 127, latitude: 37.5665, longitude: 126.978},
  sokcho: {gridX: 87, gridY: 141, latitude: 38.207, longitude: 128.5918},
  suncheon: {gridX: 70, gridY: 70, latitude: 34.9506, longitude: 127.4875},
  suwon: {gridX: 60, gridY: 121, latitude: 37.2636, longitude: 127.0286},
  ulsan: {gridX: 102, gridY: 84, latitude: 35.5384, longitude: 129.3114},
  wonju: {gridX: 76, gridY: 122, latitude: 37.3422, longitude: 127.9202},
  yeosu: {gridX: 73, gridY: 66, latitude: 34.7604, longitude: 127.6622},
  yongin: {gridX: 64, gridY: 119, latitude: 37.2411, longitude: 127.1776},
} as const satisfies Readonly<Record<WeatherCitySlug, WeatherCoordinates>>
