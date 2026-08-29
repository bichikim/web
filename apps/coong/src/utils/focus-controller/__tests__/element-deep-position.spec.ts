/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {
  getDeepPositionFromPoint,
  getDeepPositionKeyFromPoint,
  getElementDeepPosition,
  getElementDeepPositionKey,
  setElementDeepPosition,
} from '../element-deep-position'

describe('element deep position', () => {
  it('should store and restore an element deep position', () => {
    const element = document.createElement('div')
    const position = [{x: 1, y: 2}]

    setElementDeepPosition(element, position)

    expect(getElementDeepPositionKey(element)).toBe('1,2::?')
    expect(getElementDeepPosition(element)).toEqual(position)
    expect(getElementDeepPosition(document.createElement('div'))).toBeNull()
  })

  it('should resolve the first positioned HTML element at a point', () => {
    const plain = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const positioned = document.createElement('div')
    setElementDeepPosition(positioned, [{x: 3, y: 4}])
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => [plain, positioned]),
    })

    expect(getDeepPositionKeyFromPoint({x: 10, y: 20})).toBe('3,4::?')
    expect(getDeepPositionFromPoint({x: 10, y: 20})).toEqual([{x: 3, y: 4}])
  })
})
