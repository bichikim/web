import shaka from 'shaka-player'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {updateDrmRequestFilter} from '../update-drm-filter'

vi.mock('shaka-player', () => ({
  default: {
    net: {NetworkingEngine: {RequestType: {LICENSE: 1}}},
  },
}))

interface RequestFilterRequest {
  allowCrossSiteCredentials: boolean
  headers: Record<string, string>
}

describe('updateDrmRequestFilter', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should allow credentials for non-license requests', () => {
    const registerRequestFilter = vi.fn()
    const player = {
      getNetworkingEngine: () => ({registerRequestFilter, unregisterRequestFilter: vi.fn()}),
    } as unknown as shaka.Player

    updateDrmRequestFilter(player)
    const filter = registerRequestFilter.mock.calls[0]?.[0]
    const request: RequestFilterRequest = {allowCrossSiteCredentials: false, headers: {}}

    filter(0, request)

    expect(request.allowCrossSiteCredentials).toBe(true)
    expect(request.headers).toEqual({})
  })

  it('should add configured headers to license requests without credentials', () => {
    const registerRequestFilter = vi.fn()
    const player = {
      getNetworkingEngine: () => ({registerRequestFilter, unregisterRequestFilter: vi.fn()}),
    } as unknown as shaka.Player

    updateDrmRequestFilter(player, {customData: 'custom', licenseToken: 'token'})
    const filter = registerRequestFilter.mock.calls[0]?.[0]
    const request: RequestFilterRequest = {allowCrossSiteCredentials: true, headers: {}}

    filter(shaka.net.NetworkingEngine.RequestType.LICENSE, request)

    expect(request).toEqual({
      allowCrossSiteCredentials: false,
      headers: {'license-token': 'token', 'pallycon-customdata': 'custom'},
    })
  })

  it('should replace the previously registered filter', () => {
    const unregisterRequestFilter = vi.fn()
    const registerRequestFilter = vi.fn()
    const player = {
      getNetworkingEngine: () => ({registerRequestFilter, unregisterRequestFilter}),
    } as unknown as shaka.Player

    updateDrmRequestFilter(player)
    const firstFilter = registerRequestFilter.mock.calls[0]?.[0]
    updateDrmRequestFilter(player)

    expect(unregisterRequestFilter).toHaveBeenCalledWith(firstFilter)
    expect(registerRequestFilter).toHaveBeenCalledTimes(2)
  })
})
