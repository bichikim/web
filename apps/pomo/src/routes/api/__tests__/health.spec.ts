import {expect, it} from 'vitest'

import {GET} from '../health'

it('should expose a non-cached API health response', async () => {
  const response = GET()

  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  await expect(response.json()).resolves.toEqual({status: 'ok'})
})
