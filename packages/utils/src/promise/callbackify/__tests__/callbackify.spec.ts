import {callbackify} from '../'

describe('callbackify', () => {
  it('should call a callback function', (done) => {
    const callback = (error, data) => {
      expect(error).toBe(undefined)
      expect(data).toBe('foo')
      done()
    }
    callbackify(() => Promise.resolve('foo'), callback)
  })

  it('should call a callback function with an error', (done) => {
    const callback = (error, data) => {
      expect(error).toEqual(new Error('foo'))
      expect(data).toBe(undefined)
      done()
    }
    callbackify(() => Promise.reject(new Error('foo')), callback)
  })

  it('should call a callback with none promise', (done) => {
    const callback = (error, data) => {
      expect(error).toBe(undefined)
      expect(data).toBe('foo')
      done()
    }
    callbackify(() => 'foo', callback)
  })

  it('should call a callback with none promise', (done) => {
    const callback = (error, data) => {
      expect(error).toEqual(new Error('foo'))
      expect(data).toBe(undefined)
      done()
    }
    callbackify(() => {
      throw new Error('foo')
    }, callback)
  })
})
