/**
 * @vitest-environment jsdom
 */
import {describe, expect, it} from 'vitest'
import {resolveElement} from '../'

describe('resolveElement', () => {
  it('should return the element', () => {
    expect(resolveElement(null)).toBeNull()
    expect(resolveElement()).toBeNull()
    expect(resolveElement('body')?.tagName).toBe('BODY')
    expect(resolveElement(document.body)?.tagName).toBe('BODY')
  })
})
