import {formatBytes} from '../'
import {describe, expect, it} from 'vitest'

describe('formatBytes', () => {
  it('should return 10Mb', () => {
    const result = formatBytes(10_485_760)

    expect(result).toBe('10.0 MB')
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'should return n/a for invalid byte count %s',
    (bytes) => {
      expect(formatBytes(bytes)).toBe('n/a')
    },
  )

  it('should cap units at the largest supported label', () => {
    expect(formatBytes(1024 ** 6)).toBe('1048576.0 TB')
  })
})
