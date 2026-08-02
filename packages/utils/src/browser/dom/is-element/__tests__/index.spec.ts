/**
 * @vitest-environment jsdom
 */
import {describe, expect, it} from 'vitest'
import {isElement, isHtmlElement} from '../'

describe('is-element', () => {
  it('should return true with Element', () => {
    expect(isElement(document.createElement('div'))).toBe(true)
  })

  it('should return true with none Element', () => {
    expect(isElement({})).toBe(false)
  })
})

describe('is-html-element', () => {
  it('should return true with HTMLElement', () => {
    expect(isHtmlElement(document.createElement('div'))).toBe(true)
  })

  it('should return true with none HTMLElement', () => {
    expect(isHtmlElement(null)).toBe(false)
  })
})
