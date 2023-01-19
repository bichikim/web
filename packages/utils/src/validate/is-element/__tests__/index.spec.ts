/**
 * @jest-environment jsdom
 */

import {isElement} from '../'

describe('is-element', () => {
  it('should return true with HTMLElement', () => {
    expect(isElement(document.createElement('div'))).toBe(true)
  })
})
