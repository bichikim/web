import {beforeEach, expect, it, vi} from 'vitest'

const fetchMocks = vi.hoisted(() => ({raw: vi.fn()}))

vi.mock('ofetch', () => {
  class FetchError extends Error {}
  const instance = {
    create: () => instance,
    raw: fetchMocks.raw,
  }

  return {
    FetchError,
    ofetch: {create: () => instance},
  }
})

import {FetchError} from 'ofetch'
import {httpFetch} from '..'

beforeEach(() => {
  fetchMocks.raw.mockReset()
})

it('should preserve a FetchError without a response or cause', async () => {
  const error = new FetchError('fetch failed')
  fetchMocks.raw.mockRejectedValue(error)

  await expect(httpFetch('https://pomo.example/resource')).rejects.toBe(error)
})

it('should preserve an unexpected raw fetch failure', async () => {
  const error = new Error('unexpected failure')
  fetchMocks.raw.mockRejectedValue(error)

  await expect(httpFetch('https://pomo.example/resource')).rejects.toBe(error)
})
