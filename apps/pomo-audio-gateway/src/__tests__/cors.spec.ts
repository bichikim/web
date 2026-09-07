import {describe, expect, it} from 'vitest'

import {applyCorsHeaders, getAllowedOrigin} from '../cors'

const POLICY = {
  allowedOrigins: 'https://pomofi.io,tauri://localhost',
  allowedOriginSuffixes: '.vercel.app',
}

describe('getAllowedOrigin', () => {
  it.each(['https://pomofi.io', 'tauri://localhost'])(
    'should allow an exact configured origin %s',
    (origin) => {
      const request = new Request('https://audio.pomofi.io', {headers: {Origin: origin}})

      expect(getAllowedOrigin(request, POLICY)).toBe(origin)
    },
  )

  it('should allow a secure subdomain of a configured suffix', () => {
    const origin = 'https://pomo-git-feature-team.vercel.app'
    const request = new Request('https://audio.pomofi.io', {headers: {Origin: origin}})

    expect(getAllowedOrigin(request, POLICY)).toBe(origin)
  })

  it.each([
    'http://pomo-git-feature-team.vercel.app',
    'https://vercel.app',
    'https://pomo.vercel.app.evil.example',
    'not-an-origin',
  ])('should reject a non-matching suffix origin %s', (origin) => {
    const request = new Request('https://audio.pomofi.io', {headers: {Origin: origin}})

    expect(getAllowedOrigin(request, POLICY)).toBeNull()
  })
})

describe('applyCorsHeaders', () => {
  it('should expose the audio response headers to an allowed origin', () => {
    const headers = new Headers()

    applyCorsHeaders(headers, 'https://pomofi.io')

    expect(headers.get('Access-Control-Allow-Origin')).toBe('https://pomofi.io')
    expect(headers.get('Access-Control-Expose-Headers')).toBe(
      'Accept-Ranges, Content-Length, Content-Range, ETag',
    )
    expect(headers.get('Vary')).toBe('Origin')
  })
})
