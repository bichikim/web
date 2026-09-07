import {expect, it} from 'vitest'

import * as schema from '..'

it('should re-export every database schema module', () => {
  expect(schema).toMatchObject({
    calendarConnections: expect.any(Object),
    commerceProducts: expect.any(Object),
    feedChannels: expect.any(Object),
    historicalGenerationRuns: expect.any(Object),
    historicalMoments: expect.any(Object),
    musicTracks: expect.any(Object),
    pomoUsers: expect.any(Object),
    weather: expect.any(Object),
  })
})
