import * as process from 'process'
import {freeze} from '../index'
import {describe, it, expect} from 'vitest'
describe('freeze', () => {
  it('should return a frozen object', () => {
    const oldEnv = process.env.NODE_ENV

    process.env.NODE_ENV = 'development'

    const foo = freeze({foo: 'foo'})

    const error = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(foo as any).foo = ''
    }

    expect(foo).toEqual({foo: 'foo'})

    expect(error).toThrow()

    process.env.NODE_ENV = oldEnv
  })
})
