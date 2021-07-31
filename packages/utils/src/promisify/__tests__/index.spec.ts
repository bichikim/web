import {promisify} from 'src/promisify'
import {expectType} from 'tsd'

describe('promisify', () => {
  it('should make a callback function to be a returning promise resolve function', () => {
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
