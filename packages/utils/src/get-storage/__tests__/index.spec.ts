import {createGetStorage, getStorage} from '../'

describe('get Storage', () => {
  it('should return storage', () => {
    const storage = getStorage('session')
    expect(storage).toBe(sessionStorage)
  })

  it('should not return storage with error', () => {
    const getStorage = createGetStorage()
    const original = localStorage
    const setItem = jest.fn(() => {
      throw new Error('foo')
    })
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem,
      },
    })

    const storage = getStorage('local')

    expect(setItem).toBeCalledTimes(1)
    expect(storage).toBe(undefined)

    const storage2 = getStorage('local')
    expect(setItem).toBeCalledTimes(1)
    expect(storage2).toBe(undefined)

    Object.defineProperty(window, 'localStorage', {
      value: original,
    })
  })
})
