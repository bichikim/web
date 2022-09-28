import {ArrayLength, DropParameters} from '../'
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
  describe('ArrayLength', () => {
    it('should type array length', () => {
      const foo: [number, number] = [1, 2]
      const typeTest = <List extends unknown[]>(args: List): ArrayLength<List> => {
        return args as any
      }

      expectType<2>(typeTest(foo))
    })
  })
})
