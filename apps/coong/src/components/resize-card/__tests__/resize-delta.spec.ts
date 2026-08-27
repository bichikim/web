import {describe, expect, it} from 'vitest'

import {getResizeDelta, type ResizeType} from '../resize-delta'

describe('getResizeDelta', () => {
  it.each<[ResizeType | undefined, {addX: number; addY: number}]>([
    ['up', {addX: 0, addY: -1}],
    ['down', {addX: 0, addY: 1}],
    ['left', {addX: -1, addY: 0}],
    ['right', {addX: 1, addY: 0}],
    ['up-left', {addX: -1, addY: -1}],
    ['up-right', {addX: 1, addY: -1}],
    ['down-left', {addX: -1, addY: 1}],
    ['down-right', {addX: 1, addY: 1}],
    [undefined, {addX: 0, addY: 0}],
  ])('should map %s to its horizontal and vertical direction', (type, expected) => {
    expect(getResizeDelta(type)).toEqual(expected)
  })
})
