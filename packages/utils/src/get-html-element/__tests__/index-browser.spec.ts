/**
 * @jest-environment jsdom
 */

import {getHtmlElement} from '../'

describe('getHtmlElement', () => {
  it('should return HTMLElement', () => {
    expect(getHtmlElement()).toBe(HTMLElement)
  })
})
