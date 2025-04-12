import {freeze} from '../index'
import {describe, expect, it} from 'vitest'

describe('freeze', () => {
  it('should return a frozen object', () => {
    const oldEnv = process.env.NODE_ENV

    process.env.NODE_ENV = 'development'

    const foo = freeze({foo: 'foo'})

    const error = () => {
      ;(foo as any).foo = ''
    }

    expect(foo).toEqual({foo: 'foo'})
    expect(error).toThrow()
    process.env.NODE_ENV = oldEnv
  })
})
