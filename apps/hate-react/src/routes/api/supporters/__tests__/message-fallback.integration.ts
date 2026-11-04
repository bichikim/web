import {getBmcAccessToken} from 'src/env'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {GET} from '..'

vi.mock('src/env', () => ({getBmcAccessToken: vi.fn()}))

afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

describe('supporter message fallback API', () => {
  it('should retain an empty-note legacy message through the real fetch and parser', async () => {
    vi.mocked(getBmcAccessToken).mockReturnValue('fixture-token')
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {message: 'unused', support_note: 'preferred'},
            {message: 'legacy', support_note: ''},
            {message: '  padded  ', support_note: null},
            {message: 'filtered', support_note: '   '},
            {message: '', support_note: ''},
          ],
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET({} as Parameters<typeof GET>[0])

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://developers.buymeacoffee.com/api/v1/supporters?page=1',
      {headers: {Authorization: 'Bearer fixture-token'}},
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(await response.json()).toEqual({messages: ['preferred', 'legacy', '  padded  ']})
  })
})
