/**
 * @vitest-environment jsdom
 */
import {describe, expect, it} from 'vitest'
import {getWindow} from '../'

describe('getWindow', () => {
  it('should return the window', () => {
    expect(getWindow()).toBe(window)
  })
})
