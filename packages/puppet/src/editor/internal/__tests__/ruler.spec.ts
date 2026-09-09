import {expect, test} from 'vitest'
import {getRulerTicks} from '../ruler'

test('should align ruler coordinates with panning and zooming', () => {
  const ticks = getRulerTicks(100, 2, 300)
  expect(ticks.find((tick) => tick.value === 100)).toMatchObject({major: true, position: 0})
  expect(ticks.find((tick) => tick.value === 150)?.position).toBe(100)
  expect(getRulerTicks(-50, 1, 200).find((tick) => tick.value === 0)?.position).toBe(50)
})

test('should adapt tick spacing without crowding labels at either zoom limit', () => {
  for (const zoom of [0.1, 1, 8]) {
    const major = getRulerTicks(0, zoom, 500).filter((tick) => tick.major)
    expect(major[1]!.position - major[0]!.position).toBeGreaterThanOrEqual(50)
    expect(major[1]!.position - major[0]!.position).toBeLessThanOrEqual(100)
  }
})
