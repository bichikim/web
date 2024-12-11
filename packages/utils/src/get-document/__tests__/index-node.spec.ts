/**
 * @vitest-environment node
 */
import {getDocument} from '../'
import {describe, expect, it} from 'vitest'
describe('getDocument', () => {
  it('should return the document', () => {
    const doc = getDocument()
    expect(doc).toBeUndefined()
  })
})