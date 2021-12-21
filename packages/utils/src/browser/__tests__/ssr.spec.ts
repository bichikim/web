/**
 * @jest-environment node
 */
import {getDocument, getWindow} from '../'

describe('browser', () => {
  describe('window', () => {
    it('should return undefined', () => {
      const result = getWindow()
      expect(result).toBe(undefined)
    })
  })
  describe('document', () => {
    it('should return undefined', () => {
      const result = getDocument()
      expect(result).toBe(undefined)
    })
  })
})
