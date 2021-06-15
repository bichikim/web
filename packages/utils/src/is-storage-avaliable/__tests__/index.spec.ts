import {isStorageAvailable} from '../'

describe('isStorageAvailable', () => {
  it('should return true if localstorage exists', () => {
    const result = isStorageAvailable('local')
    expect(result).toBe(true)
  })
  it('should return true if sessionStorage exists', () => {
    const result = isStorageAvailable('session')
    expect(result).toBe(true)
  })
  // cannot test
  // it('should return true if sessionStorage exists', async () => {
  //   const result = isStorageAvailable('session')
  //   expect(result).toBe(false)
  // })
})
