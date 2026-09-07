import {expect, it} from 'vitest'

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
})
