import {afterEach, describe, expect, it, vi} from 'vitest'

import {fetchSupporters} from '../fetch-supporters'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchSupporters', () => {
  it('should request the selected page with bearer authentication', async () => {
    const payload = {current_page: 3, data: [{support_note: 'hello'}]}
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        headers: {'Content-Type': 'application/json'},
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchSupporters('access-token', 3)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://developers.buymeacoffee.com/api/v1/supporters?page=3',
      {headers: {Authorization: 'Bearer access-token'}},
    )
    expect(result).toEqual(payload)
  })

  it('should use the first page by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({data: []}))
    vi.stubGlobal('fetch', fetchMock)

    await fetchSupporters('access-token')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://developers.buymeacoffee.com/api/v1/supporters?page=1',
      expect.any(Object),
    )
  })

  it('should reject with the upstream status when the request fails', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, {status: 429, statusText: 'Too Many Requests'})),
    )

    return expect(fetchSupporters('access-token')).rejects.toThrow(
      'BMC API error: 429 Too Many Requests',
    )
  })
})
