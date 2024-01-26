import {toBytesSize} from '../'
import {describe, it, expect} from 'vitest'
describe('bytesToSize', () => {
  it('should return 10Mb', () => {
    const result = toBytesSize(10_485_760)
    expect(result).toBe('10.0 MB')
  })
})
