/** @vitest-environment jsdom */

import shaka from 'shaka-player'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createShaka, createShakaPlayer} from '../shaka'
import {updateCookies} from '../update-cookies'
import {updateDrmRequestFilter} from '../update-drm-filter'
import type {DrmType} from '../types'

vi.mock('shaka-player', () => ({
  default: {
    Player: vi.fn(),
    polyfill: {installAll: vi.fn()},
  },
}))

vi.mock('../update-cookies', () => ({updateCookies: vi.fn()}))
vi.mock('../update-drm-filter', () => ({updateDrmRequestFilter: vi.fn()}))

const isBrowserSupported = vi.fn()
Object.assign(shaka.Player, {isBrowserSupported})

const createPlayerStub = () => ({
  configure: vi.fn(),
  destroy: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue(undefined),
})

const usePlayerStub = (player: ReturnType<typeof createPlayerStub>) => {
  vi.mocked(shaka.Player).mockImplementation(
    class PlayerMock {
      configure = player.configure
      destroy = player.destroy
      load = player.load
    } as unknown as typeof shaka.Player,
  )
}

describe('createShaka', () => {
  beforeEach(() => {
    isBrowserSupported.mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when the browser is unsupported', () => {
    isBrowserSupported.mockReturnValue(false)

    expect(createShaka(document.createElement('video'))).toBeNull()
    expect(shaka.Player).not.toHaveBeenCalled()
  })

  it('should configure streaming and audio without legacy polyfills', () => {
    const player = createPlayerStub()
    usePlayerStub(player)

    expect(
      createShaka(document.createElement('video'), {
        modernBrowsersOnly: true,
        streaming: {stallEnabled: true},
      }),
    ).toMatchObject(player)
    expect(player.configure).toHaveBeenNthCalledWith(1, 'streaming.stallEnabled', true)
    expect(player.configure).toHaveBeenNthCalledWith(2, {preferredAudioChannelCount: 6})
    expect(shaka.polyfill.installAll).not.toHaveBeenCalled()
  })

  it('should install polyfills by default', () => {
    const player = createPlayerStub()
    usePlayerStub(player)

    createShaka(document.createElement('video'))

    expect(shaka.polyfill.installAll).toHaveBeenCalledOnce()
  })
})

describe('createShakaPlayer', () => {
  beforeEach(() => {
    isBrowserSupported.mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should update request state, configure explicit DRM, and load the URL', async () => {
    const player = createPlayerStub()
    usePlayerStub(player)
    const api = createShakaPlayer(document.createElement('video'))
    const drm = {advanced: {robustness: 'high'}, servers: {widevine: 'license'}}

    await api?.load('https://media.example/video.mpd', {cookies: 'token=value', drm})

    expect(updateDrmRequestFilter).toHaveBeenCalledWith(
      expect.objectContaining({configure: player.configure}),
      drm,
    )
    expect(updateCookies).toHaveBeenCalledWith('token=value')
    expect(player.configure).toHaveBeenCalledWith('drm', {
      advanced: drm.advanced,
      servers: drm.servers,
    })
    expect(player.load).toHaveBeenCalledWith('https://media.example/video.mpd', null)
  })

  it.each([
    {
      expected: {
        drm: {
          advanced: {
            'com.widevine.alpha': {
              audioRobustness: 'SW_SECURE_CRYPTO',
              videoRobustness: 'SW_SECURE_CRYPTO',
            },
          },
          servers: {'com.widevine.alpha': 'license'},
        },
      },
      type: 'widevine-modular',
    },
    {
      expected: ['drm.servers', {'com.microsoft.playready': 'license'}],
      type: 'play-ready',
    },
    {
      expected: ['drm.servers', {'com.widevine.alpha': 'license'}],
      type: 'widevine-classic',
    },
  ] satisfies Array<{expected: object | [string, object]; type: DrmType}>)(
    'should configure the $type license server',
    async ({expected, type}) => {
      const player = createPlayerStub()
      usePlayerStub(player)
      const api = createShakaPlayer(document.createElement('video'))

      await api?.load('video', {drm: {licenseUrl: 'license', type}})

      if (Array.isArray(expected)) {
        expect(player.configure).toHaveBeenCalledWith(...expected)
      } else {
        expect(player.configure).toHaveBeenCalledWith(expected)
      }
    },
  )

  it('should clear DRM state and delegate destruction', async () => {
    const player = createPlayerStub()
    usePlayerStub(player)
    const api = createShakaPlayer(document.createElement('video'))

    await api?.load('video')
    await api?.destroy()

    expect(player.configure).toHaveBeenCalledWith('drm.servers', {})
    expect(player.configure).toHaveBeenCalledWith('drm.advanced', {})
    expect(player.destroy).toHaveBeenCalledOnce()
  })
})
