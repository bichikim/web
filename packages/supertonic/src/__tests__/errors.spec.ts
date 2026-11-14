/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {getErrorDetail} from '@winter-love/supertonic/errors'

describe('getErrorDetail', () => {
  it('should preserve Error messages and normalize unknown thrown values', () => {
    expect(getErrorDetail(new Error('ONNX 실패'))).toBe('ONNX 실패')
    expect(getErrorDetail({reason: 'unknown'})).toBe('알 수 없는 오류')
  })
})
