/**
 * @jest-environment node
 */

import {getStorage} from 'src/get-storage'

describe('get Storage', () => {
  it('should return storage', () => {
    const storage = getStorage('session')
    expect(storage).toBe(undefined)
  })
})
