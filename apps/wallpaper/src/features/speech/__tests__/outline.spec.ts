import {expect, it} from 'vitest'
import {speechOutline} from '../outline'
import type {SpeechTail} from '../types'

it.each<{tail: SpeechTail; join: string}>([
  {
    join: 'H228 L250 -10 L240 12',
    tail: {corner: 'top-right', edge: 'top', tip: {x: 10, y: -10}, x: 240, y: 0},
  },
  {
    join: 'V88 L250 110 L228 100',
    tail: {corner: 'bottom-right', edge: 'bottom', tip: {x: 10, y: 10}, x: 240, y: 100},
  },
  {
    join: 'H12 L-10 110 L0 88',
    tail: {corner: 'bottom-left', edge: 'bottom', tip: {x: -10, y: 10}, x: 0, y: 100},
  },
  {
    join: 'V12 L-10 -10 L12 0',
    tail: {corner: 'top-left', edge: 'top', tip: {x: -10, y: -10}, x: 0, y: 0},
  },
])(
  'should replace the $tail.corner arc with a continuous join across both adjoining sides',
  ({join, tail}) => {
    const outline = speechOutline({height: 100, tail, width: 240})
    expect(outline).toContain(join)
    expect(outline.match(/Q/g)).toHaveLength(3)
    expect(outline.match(/M/g)).toHaveLength(1)
    expect(outline).toMatch(/Z$/)
  },
)

it.each<{tail: SpeechTail; join: string}>([
  {join: 'H112 L120 -16 L128 0', tail: {edge: 'top', tip: {x: 0, y: -16}, x: 120, y: 0}},
  {join: 'V42 L256 50 L240 58', tail: {edge: 'right', tip: {x: 16, y: 0}, x: 240, y: 50}},
  {join: 'H128 L120 116 L112 100', tail: {edge: 'bottom', tip: {x: 0, y: 16}, x: 120, y: 100}},
  {join: 'V58 L-16 50 L0 42', tail: {edge: 'left', tip: {x: -16, y: 0}, x: 0, y: 50}},
])(
  'should preserve the four rounded corners when the tail attaches to the $tail.edge side',
  ({join, tail}) => {
    const outline = speechOutline({height: 100, tail, width: 240})
    expect(outline).toContain(join)
    expect(outline.match(/Q/g)).toHaveLength(4)
    expect(outline.match(/M/g)).toHaveLength(1)
    expect(outline).toMatch(/Z$/)
  },
)

it('should retain a rounded closed body without a visible target', () => {
  const outline = speechOutline({height: 100, width: 240})
  expect(outline.match(/Q/g)).toHaveLength(4)
  expect(outline).not.toContain('L')
  expect(outline).toMatch(/Z$/)
})

it('should omit an outline before the body has a measurable size', () => {
  expect(speechOutline({height: 0, width: 240})).toBe('')
  expect(speechOutline({height: 100, width: 0})).toBe('')
})
