import {expectType} from 'tsd'
import {describe, expect, it} from 'vitest'
import {promisify} from '../'

describe('promisify', () => {
  it('should create a returning promise function from a callback function', () => {
    const callbackRunner = (count: number, callback: (error: any, data: number) => any) => {
      setTimeout(() => {
        callback(null, count + 1)
      }, 1)
    }
    const runner = promisify(callbackRunner)

    expectType<(count: number) => Promise<number>>(runner)

    return expect(runner(1)).resolves.toEqual(2)
  })

  it('should make a call function to be a returning promise reject function ', () => {
    const callbackRunner = (count: number, callback) => {
      setTimeout(() => {
        callback(count + 1)
      }, 1)
    }
    const runner = promisify(callbackRunner)

    return expect(runner(1)).rejects.toEqual(2)
  })
})
