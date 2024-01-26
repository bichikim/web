/* eslint-disable @typescript-eslint/ban-types */
import {expectType} from 'tsd'
import {ArrayLength, ClassFunction, DropParameters} from '../'
import {describe, expect, it, vi} from 'vitest'
describe('language', () => {
  describe('DropParameters', () => {
    it('should drop one item from an array tuple type', () => {
      // noinspection JSUnusedLocalSymbols
      const typeTest = <Func extends (...args: any[]) => any>(func: Func): DropParameters<Func> => {
        return 'foo' as any
      }

      // noinspection JSUnusedLocalSymbols
      expectType<[number]>(typeTest((foo: string, bar: number) => 'foo'))
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
  describe('ClassFunction', () => {
    it('should type class function', () => {
      const foo: Function = 'foo' as any
      expectType<ClassFunction>(foo)
    })
  })
})
