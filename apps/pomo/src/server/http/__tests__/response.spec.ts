import {describe, expect, it} from 'vitest'

import {noStoreEmpty, noStoreJson, withNoStore} from '../response'

describe('no-store Web responses', () => {
  it('should create a JSON response with security headers', async () => {
    const response = noStoreJson({error: 'unauthorized'}, {status: 401})

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({error: 'unauthorized'})
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Pragma')).toBe('no-cache')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('should preserve multiple session cookies', async () => {
    const response = noStoreJson(
      {ok: true},
      {
        cookies: ['first=1; Path=/', 'second=2; Path=/'],
      },
    )

    expect(response.headers.getSetCookie()).toEqual(['first=1; Path=/', 'second=2; Path=/'])
  })

  it('should add security headers to an upstream response', () => {
    const response = withNoStore(new Response('upstream', {headers: {'X-Upstream': 'yes'}}))

    expect(response.headers.get('X-Upstream')).toBe('yes')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('should retain security headers on a no-content response', async () => {
    const response = noStoreEmpty()

    expect(response.status).toBe(204)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})
