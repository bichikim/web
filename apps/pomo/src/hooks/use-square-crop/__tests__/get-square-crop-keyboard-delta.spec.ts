import {describe, expect, it} from 'vitest'
import {getSquareCropKeyboardDelta} from '../get-square-crop-keyboard-delta'
import type {SquareCropResizeHandle} from '../types'

const handles = [
  'north',
  'northeast',
  'northwest',
  'east',
  'southeast',
  'south',
  'southwest',
  'west',
] as const satisfies ReadonlyArray<SquareCropResizeHandle>

describe('getSquareCropKeyboardDelta', () => {
  it.each([
    {delta: {x: 0, y: 7}, key: 'ArrowDown'},
    {delta: {x: -7, y: 0}, key: 'ArrowLeft'},
    {delta: {x: 7, y: 0}, key: 'ArrowRight'},
    {delta: {x: 0, y: -7}, key: 'ArrowUp'},
  ])('should move by the configured step for $key', ({delta, key}) => {
    expect(getSquareCropKeyboardDelta(key, 7)).toEqual(delta)
  })

  it.each([
    {delta: {x: 0, y: -5}, handle: 'north', key: 'ArrowUp'},
    {delta: {x: 0, y: 0}, handle: 'north', key: 'ArrowRight'},
    {delta: {x: 0, y: 5}, handle: 'south', key: 'ArrowDown'},
    {delta: {x: 0, y: 0}, handle: 'south', key: 'ArrowLeft'},
    {delta: {x: 5, y: 0}, handle: 'east', key: 'ArrowRight'},
    {delta: {x: 0, y: 0}, handle: 'east', key: 'ArrowUp'},
    {delta: {x: -5, y: 0}, handle: 'west', key: 'ArrowLeft'},
    {delta: {x: 0, y: 0}, handle: 'west', key: 'ArrowDown'},
  ] as const)('should constrain $handle resizing to its active axis for $key', (sample) => {
    expect(getSquareCropKeyboardDelta(sample.key, 5, sample.handle)).toEqual(sample.delta)
  })

  it.each([
    {handle: 'northeast', horizontal: 1, vertical: -1},
    {handle: 'northwest', horizontal: -1, vertical: -1},
    {handle: 'southeast', horizontal: 1, vertical: 1},
    {handle: 'southwest', horizontal: -1, vertical: 1},
  ] as const)('should resize both axes together for the $handle corner', (sample) => {
    const expanding = {x: sample.horizontal * 3, y: sample.vertical * 3}
    const shrinking = {x: -sample.horizontal * 3, y: -sample.vertical * 3}

    expect(getSquareCropKeyboardDelta('ArrowRight', 3, sample.handle)).toEqual(
      sample.horizontal > 0 ? expanding : shrinking,
    )
    expect(getSquareCropKeyboardDelta('ArrowLeft', 3, sample.handle)).toEqual(
      sample.horizontal < 0 ? expanding : shrinking,
    )
    expect(getSquareCropKeyboardDelta('ArrowDown', 3, sample.handle)).toEqual(
      sample.vertical > 0 ? expanding : shrinking,
    )
    expect(getSquareCropKeyboardDelta('ArrowUp', 3, sample.handle)).toEqual(
      sample.vertical < 0 ? expanding : shrinking,
    )
  })

  it('should ignore keys that do not move the selection', () => {
    expect(getSquareCropKeyboardDelta('Enter', 5)).toBeNull()
    for (const handle of handles) {
      expect(getSquareCropKeyboardDelta('Escape', 5, handle)).toBeNull()
    }
  })
})
