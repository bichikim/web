/**
 * @jest-environment jsdom
 */

import {getElement} from '../'

describe('getElement', () => {
  it('should return the element', () => {
    expect(getElement(null)).toBeNull()
    expect(getElement()).toBeNull()
    expect(getElement('body').tagName).toBe('BODY')
    expect(getElement(document.body).tagName).toBe('BODY')
  })
})
