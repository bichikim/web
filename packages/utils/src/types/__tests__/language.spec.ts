import {DropParameters} from '../'
import {expectType} from 'tsd'

describe('language', () => {
  describe('DropParameters', () => {
    it('should drop one item from an array tuple type', () => {
      // noinspection JSUnusedLocalSymbols
      const typeTest = <Func extends (...args: any[]) => any>(func: Func): DropParameters<Func> => {
        return 'foo' as any
      }

      // noinspection JSUnusedLocalSymbols
      expectType<[number]>(typeTest((foo: string, bar: number) => 'foo'))
      expect(true).toBeTruthy()
    })
  })
})
