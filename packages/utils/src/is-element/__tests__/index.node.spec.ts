/**
 * @vitest-environment node
 */
import {describe, expect, it} from 'vitest'
import {isElement} from '../'

describe('is-element (in nodejs)', () => {
  it('should return false with string', () => {
    expect(isElement('foo')).toBe(false)
  })
})

describe('is-html-element (in nodejs)', () => {
  it('should return false with an object', () => {
    expect(isElement({})).toBe(false)
  })
})
