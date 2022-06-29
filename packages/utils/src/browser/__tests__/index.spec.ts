import {getDocument, getWindow} from '../'

describe('browser', () => {
  describe('getWindow', () => {
    it('should get window', () => {
      expect(getWindow()).toBe(window)
    })
  })

  describe('getDocument', () => {
    it('should get document', () => {
      expect(getDocument()).toBe(document)
    })
  })
})
