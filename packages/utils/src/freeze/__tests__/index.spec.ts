import * as process from 'process'
import {freeze} from '../index'

describe('freeze', function test() {
  it('should return freeze object', function test() {
    const oldEnv = process.env.NODE_ENV

    process.env.NODE_ENV = 'development'

    const foo = freeze({foo: 'foo'})

    const error = () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // noinspection JSConstantReassignment
      foo.foo = ''
    }

    expect(foo).toEqual({foo: 'foo'})

    expect(error).toThrow()

    process.env.NODE_ENV = oldEnv
  })
})
