import {describe, expect, it} from 'vitest'
import {csrfMiddleware} from '../csrf'

const runCsrfMiddleware = async (request: Request) => {
  const onRequest = csrfMiddleware.onRequest

  if (typeof onRequest === 'function') {
    return onRequest({request})
  }

  if (Array.isArray(onRequest)) {
    return onRequest[0]?.({request})
  }
}

describe('csrfMiddleware', () => {
  it('should allow https unsafe requests with same-origin referer', async () => {
    const request = new Request('https://coong.example/api/profile', {
      headers: {
        Referer: 'https://coong.example/settings',
      },
      method: 'POST',
    })

    const response = await runCsrfMiddleware(request)

    expect(response).toBeUndefined()
  })

  it('should reject https unsafe requests with cross-origin referer', async () => {
    const request = new Request('https://coong.example/api/profile', {
      headers: {
        Referer: 'https://evil.example/settings',
      },
      method: 'POST',
    })

    const response = await runCsrfMiddleware(request)

    expect(response?.status).toBe(403)
  })
})
