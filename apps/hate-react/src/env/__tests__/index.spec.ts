import {afterEach, describe, expect, it, vi} from 'vitest'

import {getApiBaseUrl, getBmcAccessToken, getBmcUsername} from '../index'

const originalEnvironment = {...process.env}

afterEach(() => {
  process.env = {...originalEnvironment}
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('supporter environment', () => {
  it('should read Buy Me a Coffee values from the server environment', () => {
    process.env.BUYMEACOFFEE_ACCESS_TOKEN = 'token'
    process.env.BUYMEACOFFEE_USERNAME = 'creator'

    expect(getBmcAccessToken()).toBe('token')
    expect(getBmcUsername()).toBe('creator')
  })
})

describe('getApiBaseUrl', () => {
  it('should use the current browser origin in the browser', () => {
    vi.stubGlobal('window', {location: {origin: 'https://client.example'}})

    expect(getApiBaseUrl()).toBe('https://client.example')
  })

  it('should fall back to the default local port without a request', () => {
    expect(getApiBaseUrl()).toBe('http://localhost:3000')
  })
})
