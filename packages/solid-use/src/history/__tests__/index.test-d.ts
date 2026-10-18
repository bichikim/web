import type {Accessor} from 'solid-js'
import {expectTypeOf, it} from 'vitest'
import {useHistory} from '../index'

it('should infer a tuple of typed readers and a writer from the initial history', () => {
  type NumberHistory = [Accessor<number | undefined>, (value: number) => void, Accessor<number[]>]
  const result = useHistory([1])
  const [currentValue, addValue, history] = result

  expectTypeOf(result).toEqualTypeOf<NumberHistory>()
  expectTypeOf(currentValue()).toEqualTypeOf<number | undefined>()
  expectTypeOf(addValue).parameter(0).toEqualTypeOf<number>()
  expectTypeOf(addValue(2)).toBeVoid()
  expectTypeOf(history()).toEqualTypeOf<number[]>()
})

it('should preserve an explicit value type when the initial history is omitted', () => {
  const [currentValue, addValue, history] = useHistory<string>()

  expectTypeOf(currentValue()).toEqualTypeOf<string | undefined>()
  expectTypeOf(addValue).parameter(0).toEqualTypeOf<string>()
  expectTypeOf(addValue('next')).toBeVoid()
  expectTypeOf(history()).toEqualTypeOf<string[]>()
})
