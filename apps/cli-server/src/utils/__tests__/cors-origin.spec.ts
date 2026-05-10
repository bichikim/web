import {describe, expect, it} from 'vitest'
import {resolveAllowedCorsOrigin} from '../cors-origin'

describe('resolveAllowedCorsOrigin', () => {
  it('should allow loopback browser origins', () => {
    expect(resolveAllowedCorsOrigin('http://localhost:5173')).toBe('http://localhost:5173')
    expect(resolveAllowedCorsOrigin('http://127.0.0.1:5173')).toBe('http://127.0.0.1:5173')
    expect(resolveAllowedCorsOrigin('http://[::1]:5173')).toBe('http://[::1]:5173')
  })

  it('should reject non-loopback and invalid origins', () => {
    expect(resolveAllowedCorsOrigin('https://evil.example')).toBeUndefined()
    expect(resolveAllowedCorsOrigin('null')).toBeUndefined()
    expect(resolveAllowedCorsOrigin('not a url')).toBeUndefined()
  })
})
