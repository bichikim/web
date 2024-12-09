import shaka from 'shaka-player'
import {createSignal} from 'solid-js'
import {isDtsSupported} from './check'
import {
  DrmOptions,
  LoadOptions,
  PlayerApi,
  PlayerAPiOptions,
  PlayerLoadApi,
  PlayerState,
} from './types'
import {updateCookies} from './update-cookies'
import {useEvent} from '@winter-love/solid-use'

export const createShaka = (
  element: HTMLVideoElement,
  options: PlayerAPiOptions = {},
): null | shaka.Player => {
  const {streaming: {stallEnabled} = {}} = options

  if (!shaka.Player.isBrowserSupported()) {
    return null
  }

  const shakaPlayer = new shaka.Player(element)

  if (stallEnabled) {
    shakaPlayer.configure('streaming.stallEnabled', true)
  }

  if (!isDtsSupported()) {
    shakaPlayer.configure(
      // manifestPreprocessor is deprecated
      'manifest.dash.manifestPreprocessorTXml',
      (mpd: shaka.extern.xml.Node) => {
        for (const mpdChild of mpd.children) {
          if (mpdChild instanceof Element && mpdChild.tagName === 'Period') {
            mpdChild.setAttribute('start', 'PT0.4S')
          }
        }
      },
    )
  }

  return shakaPlayer
}

export const createShakaPlayer = (
  element: HTMLVideoElement,
  options: PlayerAPiOptions = {},
): undefined | PlayerLoadApi => {
  const shakaPlayer = createShaka(element, options)

  if (!shakaPlayer) {
    return
  }

  const updateDrm = (drm: DrmOptions = {}) => {
    const {advanced, servers, licenseUrl, type, cookies} = drm
    updateCookies(cookies)

    if (advanced || servers) {
      shakaPlayer.configure('drm', {
        advanced: advanced,
        servers: servers,
      })
    } else if (licenseUrl) {
      switch (type) {
        case 'widevine-modular': {
          shakaPlayer.configure({
            drm: {
              advanced: {
                'com.widevine.alpha': {
                  audioRobustness: 'SW_SECURE_CRYPTO',
                  videoRobustness: 'SW_SECURE_CRYPTO',
                },
              },
              servers: {
                'com.widevine.alpha': licenseUrl,
              },
            },
          })
          return
        }
        case 'play-ready': {
          shakaPlayer.configure('drm.servers', {
            'com.microsoft.playready': licenseUrl,
          })
          return
        }
        default: {
          shakaPlayer.configure('drm.servers', {
            'com.widevine.alpha': licenseUrl,
          })
        }
      }
    } else {
      shakaPlayer.configure('drm.servers', {})
      shakaPlayer.configure('drm.advanced', {})
    }
  }

  const load = (url: string, options: LoadOptions = {}) => {
    updateDrm(options.drm)

    return shakaPlayer.load(url, null)
  }

  const destroy = () => {
    return shakaPlayer.destroy()
  }

  return {destroy, load}
}
