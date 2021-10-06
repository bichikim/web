import {isAtom} from '../utils'
import {atom} from '../index'
import {reactive} from 'vue-demi'
describe('utils', () => {
  describe('isAtom', () => {
    it('should return true', () => {
      expect(isAtom(atom({name: 'foo'}))).toBe(true)
    })
    it('should not return true', () => {
      expect(isAtom(reactive({name: 'foo'}))).toBe(false)
    })
  })
})
