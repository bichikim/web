/**
 * @jest-environment jsdom
 */

import {getWindow} from '../'

describe('getWindow', () => {
  it('should return the window', () => {
    expect(getWindow()).toBe(window)
  })
})
