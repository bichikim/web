import {not} from '../index'

describe('functional-programming', function test() {
  describe('not', function test() {
    it('should return a opposite value false', function test() {
      const result = not(false)
      expect(result).toEqual(true)
    })

    it('should return a opposite value true', function test() {
      const result = not(true)
      expect(result).toEqual(false)
    })

    it('should return a opposite value string', function test() {
      const result = not('')
      expect(result).toEqual(true)
    })
  })
})
