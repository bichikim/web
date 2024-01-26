import {getDocument} from '../'
import {describe, it, expect} from 'vitest'
describe('getDocument', () => {
  it('should return the document', () => {
    const doc = getDocument()
    expect(doc).toBe(document)
  })
})
