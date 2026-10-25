import {describe, expect, it} from 'vitest'
import {createChangeWindow} from '../create-change-window'

describe('createChangeWindow', () => {
  it.each([1, 5002, 70001, 524271])('should keep scroll geometry bounded for %i rows', (count) => {
    const initial = createChangeWindow({count, height: 400, offset: 0})
    const last = createChangeWindow({count, height: 400, offset: initial.locate(count - 1)})
    expect(initial.total).toBeLessThanOrEqual(7000000)
    expect(last.end).toBe(count)
    expect(last.top).toBeGreaterThanOrEqual(0)
    expect(last.bottom).toBe(0)
    expect(last.top + (last.end - last.start) * 24).toBeCloseTo(initial.total)
    expect(last.end - last.start).toBeLessThan(60)
  })
  it.each([0, 10, 1000, 349543, 524270])(
    'should mount and center logical destination %i after scaling',
    (index) => {
      const initial = createChangeWindow({count: 524271, height: 400, offset: 0})
      const offset = initial.locate(index)
      const window = createChangeWindow({count: 524271, height: 400, offset})
      expect(window.start).toBeLessThanOrEqual(index)
      expect(window.end).toBeGreaterThan(index)
      const top = window.top + (index - window.start) * 24 - offset
      expect(top).toBeGreaterThanOrEqual(-0.01)
      expect(top + 24).toBeLessThanOrEqual(400.01)
      expect(window.top + (window.end - window.start) * 24 + window.bottom).toBeCloseTo(
        window.total,
      )
    },
  )
  it('should expose an empty window without negative gaps for an empty comparison', () => {
    const window = createChangeWindow({count: 0, height: 400, offset: 100})
    expect(window).toMatchObject({bottom: 0, end: 0, start: 0, top: 0, total: 0})
    expect(window.locate(0)).toBe(0)
  })
})
