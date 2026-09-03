/** @vitest-environment jsdom */

import {afterEach, describe, expect, it} from 'vitest'

import {cssPixelsToRem} from '../css-units'

describe('cssPixelsToRem', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style')
  })

  it('should use the current root font size when converting a CSS pixel measurement', () => {
    document.documentElement.style.fontSize = '20px'

    expect(cssPixelsToRem(30)).toBe('1.5rem')
  })

  it('should fall back to the browser default root font size when it is unavailable', () => {
    expect(cssPixelsToRem(16)).toBe('1rem')
  })

  it('should preserve zero and negative measurements', () => {
    expect(cssPixelsToRem(0)).toBe('0rem')
    expect(cssPixelsToRem(-8)).toBe('-0.5rem')
  })
})
