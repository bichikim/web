import type {FetchEvent} from '@solidjs/start/server'
import {describe, expect, it} from 'vitest'

import {preventStaticRequest} from '../prevent-static-request'

const runMiddleware = async (url: string) => {
  const onRequest = preventStaticRequest.onRequest
  const callback = Array.isArray(onRequest) ? onRequest[0] : onRequest

  return callback?.({request: new Request(url)} as FetchEvent)
}

describe('preventStaticRequest', () => {
  it.each(['/assets/app.js', '/cover.JPG', '/preset/data.json?version=1'])(
    'should return not found for the static asset path %s',
    async (pathname) => {
      const response = await runMiddleware(`https://coong.example${pathname}`)

      expect(response?.status).toBe(404)
      expect(await response?.text()).toBe('Not Found')
    },
  )

  it.each(['/music', '/profile.name/edit', '/api/posts'])(
    'should allow route path %s',
    async (pathname) => {
      expect(await runMiddleware(`https://coong.example${pathname}`)).toBeUndefined()
    },
  )
})
