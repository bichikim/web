import {describe, expect, it} from 'vitest'

import {getOrientationAxes, getOrientationOffset} from '../device-orientation'

describe('getOrientationAxes', () => {
  it('should map device axes to the current screen orientation', () => {
    expect(getOrientationAxes(20, 10, 0)).toEqual({x: 10, y: 20})
    expect(getOrientationAxes(20, 10, 90)).toEqual({x: 20, y: -10})
    expect(getOrientationAxes(20, 10, 180)).toEqual({x: -10, y: -20})
    expect(getOrientationAxes(20, 10, 270)).toEqual({x: -20, y: 10})
  })

  it('should ignore incomplete sensor samples', () => {
    expect(getOrientationAxes(null, 10, 0)).toBeNull()
    expect(getOrientationAxes(20, null, 0)).toBeNull()
  })

  it('should use portrait axes for a non-cardinal screen angle', () => {
    expect(getOrientationAxes(20, 10, 45)).toEqual({x: 10, y: 20})
    expect(getOrientationAxes(20, 10, -315)).toEqual({x: 10, y: 20})
  })
})

describe('getOrientationOffset', () => {
  it('should scale and clamp tilt against the calibrated baseline', () => {
    expect(getOrientationOffset({x: 9, y: -7}, {x: 0, y: 0})).toEqual({x: 0.5, y: -0.5})
    expect(getOrientationOffset({x: 40, y: -40}, {x: 0, y: 0})).toEqual({x: 1, y: -1})
  })

  it('should suppress tiny sensor changes', () => {
    expect(getOrientationOffset({x: 0.2, y: -0.2}, {x: 0, y: 0})).toEqual({x: 0, y: 0})
  })

  it('should use the shortest delta across the device angle boundary', () => {
    const offset = getOrientationOffset({x: -179, y: 179}, {x: 179, y: -179})

    expect(offset.x).toBeCloseTo(2 / 18)
    expect(offset.y).toBeCloseTo(-2 / 14)
  })
})
