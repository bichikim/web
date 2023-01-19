/**
 * @jest-environment jsdom
 */

import {getHtmlElementClass} from '../'

describe('getHtmlElement', () => {
  it('should return HTMLElement', () => {
    expect(getHtmlElementClass()).toBe(HTMLElement)
  })
})
