import {getBmcAccessToken} from 'src/env'
import {fetchSupporters, filterWithMessage} from 'src/utils/supporters'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {GET} from '../index'

vi.mock('src/env', () => ({
  getBmcAccessToken: vi.fn(),
}))

vi.mock('src/utils/supporters', () => ({
  fetchSupporters: vi.fn(),
  filterWithMessage: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET', () => {
  it('should return a cacheable empty list when the access token is absent', async () => {
    vi.mocked(getBmcAccessToken).mockReturnValue(undefined)

    const response = await GET({} as Parameters<typeof GET>[0])

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
    expect(await response.json()).toEqual({messages: []})
    expect(fetchSupporters).not.toHaveBeenCalled()
  })

  it('should return filtered supporter messages with public caching', async () => {
    const data = [{support_note: 'hello'}]
    vi.mocked(getBmcAccessToken).mockReturnValue('access-token')
    vi.mocked(fetchSupporters).mockResolvedValue({data})
    vi.mocked(filterWithMessage).mockReturnValue(['hello'])

    const response = await GET({} as Parameters<typeof GET>[0])

    expect(fetchSupporters).toHaveBeenCalledWith('access-token', 1)
    expect(filterWithMessage).toHaveBeenCalledWith(data)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
    expect(await response.json()).toEqual({messages: ['hello']})
  })

  it('should return an uncached empty list when the upstream request fails', async () => {
    vi.mocked(getBmcAccessToken).mockReturnValue('access-token')
    vi.mocked(fetchSupporters).mockRejectedValue(new Error('upstream failed'))

    const response = await GET({} as Parameters<typeof GET>[0])

    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({messages: []})
  })
})
