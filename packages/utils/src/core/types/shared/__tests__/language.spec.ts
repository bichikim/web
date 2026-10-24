import {expectType} from 'tsd'
import {describe, it} from 'vitest'
import {ArrayLength, ClassFunction, DropParameters, DropRightParametersFunction} from '../'

describe('language', () => {
  describe('DropParameters', () => {
    it('should drop one item from an array tuple type', () => {
      // noinspection JSUnusedLocalSymbols
      const typeTest = <Func extends (...args: any[]) => any>(_: Func): DropParameters<Func> => {
        return 'foo' as any
      }

      // noinspection JSUnusedLocalSymbols
      expectType<[number]>(typeTest((_: string, __: number) => 'foo'))
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

  describe('DropRightParametersFunction', () => {
    it('should remove the last function parameter', () => {
      type Source = (name: string, count: number) => boolean
      type Result = DropRightParametersFunction<Source>

      expectType<(name: string) => boolean>({} as Result)
    })
  })

  describe('ClassFunction', () => {
    it('should type class function', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      const foo: Function = 'foo' as any

      expectType<ClassFunction>(foo)
    })
  })
})
