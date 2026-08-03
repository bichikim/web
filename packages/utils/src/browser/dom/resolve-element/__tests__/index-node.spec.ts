/**
 * @vitest-environment node
 */
import {describe, expect, it} from 'vitest'
import {resolveElement} from '../'

describe('resolveElement in Node.js', () => {
  it('should return undefined for a selector when no document exists', () => {
    expect(resolveElement('body')).toBeUndefined()
  })
})
