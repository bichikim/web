import {getDocument} from '../'

describe('getDocument', () => {
  it('should return the document', () => {
    const doc = getDocument()
    expect(doc).toBeUndefined()
  })
})
