import {promisify} from '../index'

describe('promisify', function test() {
  it('should make a callback function to be a returning promise resolve function', async function test() {
    const callbackRunner = (a, callback) => {
      setTimeout(() => {
        // eslint-disable-next-line node/no-callback-literal
        callback(null, a + 1)
      }, 1)
    }

    const runner = promisify(callbackRunner)

    return expect(runner(1)).resolves.toEqual(2)
  })

  it('should make a call function to be a returning promise reject function ', function test() {
    const callbackRunner = (a, callback) => {
      setTimeout(() => {
        // eslint-disable-next-line node/no-callback-literal
        callback(a + 1)
      }, 1)
    }

    const runner = promisify(callbackRunner)

    return expect(runner(1)).rejects.toEqual(2)
  })
})
