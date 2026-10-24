import {describe, expect, test} from 'vitest'

import {getSurfaceWeights} from '../get-surface-weights'

describe('getSurfaceWeights', () => {
  test('should interpolate endpoints and their tangents when handles are present', () => {
    const start = getSurfaceWeights({
      bottomHasHandle: true,
      horizontalProgress: 0,
      topHasHandle: true,
      verticalProgress: 0,
    })
    const end = getSurfaceWeights({
      bottomHasHandle: true,
      horizontalProgress: 1,
      topHasHandle: true,
      verticalProgress: 1,
    })

    expect(start.horizontal).toEqual(start.vertical)
    expect(start.vertical).toEqual({
      point: {end: 0, endTangent: 0, start: 1, startTangent: 0},
      tangent: {end: 0, endTangent: 0, start: 0, startTangent: 1},
    })
    expect(end.horizontal).toEqual(end.vertical)
    expect(end.vertical).toEqual({
      point: {end: 1, endTangent: 0, start: 0, startTangent: 0},
      tangent: {end: 0, endTangent: 1, start: 0, startTangent: 0},
    })
  })

  test.each([
    {
      bottomHasHandle: false,
      end: 0.5,
      endTangent: 0,
      slope: 1,
      start: 0.5,
      startTangent: 0,
      topHasHandle: false,
    },
    {
      bottomHasHandle: true,
      end: 0.625,
      endTangent: -0.125,
      slope: 1.25,
      start: 0.375,
      startTangent: 0,
      topHasHandle: false,
    },
    {
      bottomHasHandle: false,
      end: 0.375,
      endTangent: 0,
      slope: 1.25,
      start: 0.625,
      startTangent: 0.125,
      topHasHandle: true,
    },
  ])(
    'should fold missing tangent influence into the endpoint weights: $topHasHandle/$bottomHasHandle',
    (fixture) => {
      const weights = getSurfaceWeights({
        ...fixture,
        horizontalProgress: 0.5,
        verticalProgress: 0.5,
      })

      expect(weights.vertical.point).toEqual({
        end: fixture.end,
        endTangent: fixture.endTangent,
        start: fixture.start,
        startTangent: fixture.startTangent,
      })
      expect(weights.vertical.tangent).toEqual({
        end: fixture.slope,
        endTangent: fixture.bottomHasHandle ? -0.25 : 0,
        start: -fixture.slope,
        startTangent: fixture.topHasHandle ? -0.25 : 0,
      })
      expect(weights.horizontal.point).toEqual({
        end: 0.5,
        endTangent: -0.125,
        start: 0.5,
        startTangent: 0.125,
      })
    },
  )
})
