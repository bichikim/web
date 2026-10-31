import {getBmcAccessToken} from 'src/env'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GET} from '..'

vi.mock('src/env', () => ({
  getBmcAccessToken: vi.fn(),
}))

const fetchMock = vi.fn<typeof fetch>()
const request = () => GET({} as Parameters<typeof GET>[0])
const pageResponse = (body: unknown) => new Response(JSON.stringify(body))

afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.mocked(getBmcAccessToken).mockReturnValue('fixture-token')
})

describe('GET', () => {
  it('should return a cacheable empty list when the access token is absent', async () => {
    vi.mocked(getBmcAccessToken).mockReturnValue(undefined)
    const response = await request()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
    expect(await response.json()).toEqual({messages: []})
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should return filtered messages when pagination metadata is absent', async () => {
    fetchMock.mockResolvedValue(pageResponse({data: [{support_note: 'hello'}, {}]}))
    const response = await request()

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://developers.buymeacoffee.com/api/v1/supporters?page=1',
      {headers: {Authorization: 'Bearer fixture-token'}},
    )
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(await response.json()).toEqual({messages: ['hello']})
  })

  it('should include every page in order even when an intermediate page has no messages', async () => {
    fetchMock
      .mockResolvedValueOnce(
        pageResponse({current_page: 1, data: [{support_note: 'first'}], last_page: 3}),
      )
      .mockResolvedValueOnce(
        pageResponse({current_page: 2, data: [{support_note: '  '}], last_page: 3}),
      )
      .mockResolvedValueOnce(
        pageResponse({current_page: 3, data: [{message: 'last'}], last_page: 3}),
      )

    const response = await request()

    expect(await response.json()).toEqual({messages: ['first', 'last']})
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      [1, 2, 3].map((page) => `https://developers.buymeacoffee.com/api/v1/supporters?page=${page}`),
    )
  })

  it('should return a cacheable empty list for an empty single page', async () => {
    fetchMock.mockResolvedValue(pageResponse({current_page: 1, last_page: 1}))
    const response = await request()

    expect(await response.json()).toEqual({messages: []})
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([1, 2])(
    'should discard partial results and disable caching when page %i fails',
    async (failedPage) => {
      if (failedPage === 2) {
        fetchMock.mockResolvedValueOnce(
          pageResponse({current_page: 1, data: [{message: 'partial'}], last_page: 2}),
        )
      }
      fetchMock.mockResolvedValueOnce(new Response(null, {status: 503}))
      const response = await request()

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(await response.json()).toEqual({messages: []})
      expect(fetchMock).toHaveBeenCalledTimes(failedPage)
    },
  )

  it.each([10, 100])('should read %i pages with one request at a time', async (last_page) => {
    let active = 0
    let maximum = 0
    fetchMock.mockImplementation(async (url) => {
      active += 1
      maximum = Math.max(maximum, active)
      const current_page = Number(new URL(String(url)).searchParams.get('page'))
      await Promise.resolve()
      active -= 1
      return pageResponse({current_page, data: [{message: String(current_page)}], last_page})
    })
    const response = await request()

    expect(await response.json()).toEqual({
      messages: Array.from({length: last_page}, (_, index) => String(index + 1)),
    })
    expect(fetchMock).toHaveBeenCalledTimes(last_page)
    expect(maximum).toBe(1)
  })

  it.each(['json', 'network', 'data'])(
    'should disable caching for invalid upstream %s',
    async (failure) => {
      if (failure === 'json') {
        fetchMock.mockResolvedValue(new Response('{'))
      } else if (failure === 'network') {
        fetchMock.mockRejectedValue(new Error('fixture network failure'))
      } else {
        fetchMock.mockResolvedValue(pageResponse({data: {message: 'invalid'}}))
      }
      const response = await request()

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({messages: []})
      expect(response.headers.get('Cache-Control')).toBe('no-store')
    },
  )

  it.each([2, 0, null, '1'])(
    'should reject an unexpected initial current_page %j',
    async (current_page) => {
      fetchMock.mockResolvedValue(
        pageResponse({current_page, data: [{message: 'partial'}], last_page: 2}),
      )
      const response = await request()

      expect(await response.json()).toEqual({messages: []})
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    },
  )

  it.each([0, -1, 1.5, '2', null, Number.MAX_SAFE_INTEGER + 1])(
    'should reject invalid last_page %j without fetching further pages',
    async (last_page) => {
      fetchMock.mockResolvedValue(
        pageResponse({current_page: 1, data: [{message: 'partial'}], last_page}),
      )
      const response = await request()

      expect(await response.json()).toEqual({messages: []})
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    },
  )

  it.each([
    {current_page: 1, last_page: 2},
    {current_page: 3, last_page: 2},
    {current_page: 2, last_page: 3},
    {last_page: 2},
  ])('should stop on inconsistent later-page metadata %j', async (metadata) => {
    fetchMock
      .mockResolvedValueOnce(
        pageResponse({current_page: 1, data: [{message: 'partial'}], last_page: 2}),
      )
      .mockResolvedValue(pageResponse({...metadata, data: [{message: 'duplicate'}]}))
    const response = await request()

    expect(await response.json()).toEqual({messages: []})
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
