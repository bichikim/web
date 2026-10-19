import {expect, it} from 'vitest'
import {speechTail} from '../tail'

it('should attach below the character-facing part of a bubble shifted left at the screen edge', () => {
  expect(speechTail({height: 100, width: 240, x: 280, y: 220})).toEqual({
    edge: 'bottom',
    x: 220,
    y: 100,
  })
})

it('should choose each edge from the character position rather than the saved bubble anchor', () => {
  expect(speechTail({height: 100, width: 240, x: -100, y: 40})).toEqual({edge: 'left', x: 0, y: 40})
  expect(speechTail({height: 100, width: 240, x: 340, y: 60})).toEqual({
    edge: 'right',
    x: 240,
    y: 60,
  })
  expect(speechTail({height: 100, width: 240, x: 100, y: -200})).toEqual({
    edge: 'top',
    x: 100,
    y: 0,
  })
  expect(speechTail({height: 100, width: 240, x: -20, y: 220})).toEqual({
    edge: 'bottom',
    x: 20,
    y: 100,
  })
})

it('should omit a misleading tail when the character target is inside the bubble or dimensions are empty', () => {
  expect(speechTail({height: 100, width: 240, x: 120, y: 50})).toBeNull()
  expect(speechTail({height: 0, width: 0, x: 120, y: 50})).toBeNull()
})
