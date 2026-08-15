/** @vitest-environment jsdom */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {getPScenePanPosition, supportsPSceneGyroscope} from '../scene-motion'

describe('scene motion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    {expected: 0, horizontalPosition: -1},
    {expected: 30, horizontalPosition: -0.5},
    {expected: 60, horizontalPosition: 0},
    {expected: 80, horizontalPosition: 0.5},
    {expected: 100, horizontalPosition: 1},
  ])('should map $horizontalPosition to the $expected% crop position', (testCase) => {
    expect(getPScenePanPosition(testCase.horizontalPosition)).toBe(testCase.expected)
  })

  it('should clamp input to the available crop range', () => {
    expect(getPScenePanPosition(-2)).toBe(0)
    expect(getPScenePanPosition(2)).toBe(100)
  })

  it('should report gyroscope support for coarse non-hover clients with the sensor API', () => {
    vi.stubGlobal('DeviceOrientationEvent', class extends Event {})
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({matches: true})),
    )

    expect(supportsPSceneGyroscope()).toBe(true)
  })

  it('should hide gyroscope controls from fine-pointer clients', () => {
    vi.stubGlobal('DeviceOrientationEvent', class extends Event {})
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({matches: false})),
    )

    expect(supportsPSceneGyroscope()).toBe(false)
  })
})
