/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {computeRoute, inject, pageview} from '@vercel/analytics'
import {useLocation, useParams} from '@solidjs/router'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {Analytics, getBasePath} from '../Analytics'

vi.mock('@solidjs/router', () => ({
  useLocation: vi.fn(),
  useParams: vi.fn(),
}))

vi.mock('@vercel/analytics', () => ({
  computeRoute: vi.fn(),
  inject: vi.fn(),
  pageview: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(useLocation).mockReturnValue({pathname: '/music', search: 'page=2'} as ReturnType<
    typeof useLocation
  >)
  vi.mocked(useParams).mockReturnValue({id: 'track'} as ReturnType<typeof useParams>)
  vi.mocked(computeRoute).mockReturnValue('/music')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('Analytics', () => {
  it('should remain inert when analytics is disabled', () => {
    vi.stubEnv('VITE_ENABLE_ANALYTICS', 'false')

    render(() => <Analytics />)

    expect(inject).not.toHaveBeenCalled()
    expect(pageview).not.toHaveBeenCalled()
  })

  it('should inject analytics and report the reactive route when enabled', () => {
    vi.stubEnv('VITE_ENABLE_ANALYTICS', 'true')

    render(() => <Analytics />)

    expect(inject).toHaveBeenCalledWith({
      basePath: getBasePath(),
      disableAutoTrack: true,
      framework: 'solid-start',
    })
    expect(pageview).toHaveBeenCalledWith({path: '/music?page=2', route: '/music'})
  })
})
