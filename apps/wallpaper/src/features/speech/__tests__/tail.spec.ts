import {expect, it} from 'vitest'
import {speechTail} from '../tail'

it('should attach directly to the bottom-right corner when the character is diagonally outside', () => {
  expect(speechTail({height: 100, width: 240, x: 280, y: 220})).toMatchObject({
    corner: 'bottom-right',
    edge: 'bottom',
    x: 240,
    y: 100,
  })
})

it('should choose each edge from the character position rather than the saved bubble anchor', () => {
  expect(speechTail({height: 100, width: 240, x: -100, y: 40})).toMatchObject({
    edge: 'left',
    x: 0,
    y: 40,
  })
  expect(speechTail({height: 100, width: 240, x: 340, y: 60})).toMatchObject({
    edge: 'right',
    x: 240,
    y: 60,
  })
  expect(speechTail({height: 100, width: 240, x: 100, y: -200})).toMatchObject({
    edge: 'top',
    x: 100,
    y: 0,
  })
  expect(speechTail({height: 100, width: 240, x: -20, y: 220})).toMatchObject({
    corner: 'bottom-left',
    edge: 'bottom',
    x: 0,
    y: 100,
  })
})

it('should omit a misleading tail when the character target is inside the bubble or dimensions are empty', () => {
  expect(speechTail({height: 100, width: 240, x: 120, y: 50})).toBeNull()
  expect(speechTail({height: 0, width: 0, x: 120, y: 50})).toBeNull()
  expect(speechTail({height: 100, width: 240, x: Number.NaN, y: 50})).toBeNull()
})

it.each([
  {corner: 'bottom-right', edge: 'bottom', x: 280, y: 220},
  {corner: 'bottom-left', edge: 'bottom', x: -40, y: 220},
  {corner: 'top-right', edge: 'top', x: 280, y: -120},
  {corner: 'top-left', edge: 'top', x: -40, y: -120},
  {corner: undefined, edge: 'right', x: 400, y: 90},
  {corner: undefined, edge: 'left', x: -160, y: 10},
])('should attach to $corner or $edge and aim at ($x, $y)', ({corner, edge, x, y}) => {
  const tail = speechTail({height: 100, width: 240, x, y})!
  expect(tail.edge).toBe(edge)
  expect(tail.corner).toBe(corner)
  expect(Math.hypot(tail.tip.x, tail.tip.y)).toBeCloseTo(16)
  expect(tail.tip.x * (y - tail.y) - tail.tip.y * (x - tail.x)).toBeCloseTo(0)
  expect(tail.tip.x * (x - tail.x) + tail.tip.y * (y - tail.y)).toBeGreaterThan(0)
})

it('should retain straight horizontal tails and stop short of a nearby character', () => {
  expect(speechTail({height: 100, width: 240, x: 340, y: 60})?.tip).toEqual({x: 16, y: 0})
  expect(speechTail({height: 100, width: 240, x: -100, y: 40})?.tip).toEqual({x: -16, y: 0})
  expect(speechTail({height: 100, width: 240, x: 245, y: 50})?.tip).toEqual({x: 5, y: 0})
  expect(speechTail({height: 100, width: 240, x: 245, y: 105})?.tip).toEqual({x: 5, y: 5})
})

it('should preserve top and bottom attachments when the character is vertically aligned', () => {
  expect(speechTail({height: 100, width: 240, x: 120, y: -100})).toEqual({
    edge: 'top',
    tip: {x: 0, y: -16},
    x: 120,
    y: 0,
  })
  expect(speechTail({height: 100, width: 240, x: 120, y: 200})).toEqual({
    edge: 'bottom',
    tip: {x: 0, y: 16},
    x: 120,
    y: 100,
  })
})

it('should adjust the angle continuously within the same attachment edge', () => {
  const first = speechTail({height: 100, width: 240, x: 280, y: 220})!
  const next = speechTail({height: 100, width: 240, x: 281, y: 220})!
  expect(next.tip.x).toBeGreaterThan(first.tip.x)
  expect(next.tip.x - first.tip.x).toBeLessThan(0.2)
  expect(next.tip.y).toBeLessThan(first.tip.y)
})
