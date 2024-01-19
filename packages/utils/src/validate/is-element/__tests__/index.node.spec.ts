/**
 * @vitest-environment node
 */
import {isElement} from '../'
import {describe, expect, it, vi} from 'vitest'
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
