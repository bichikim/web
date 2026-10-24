import shaka from 'shaka-player'
import {updateDrmRequestFilter} from 'src/player/update-drm-filter'
import {isDtsSupported} from './check'
import {DrmOptions, LoadOptions, PlayerAPiOptions, PlayerLoadApi} from './types'
import {updateCookies} from './update-cookies'

const fixAtmosOrder = (player: shaka.Player) => {
  player.configure({
    preferredAudioChannelCount: 6,
  })
}

const configPlayer = (shakaPlayer: shaka.Player, options: PlayerAPiOptions = {}) => {
  const {streaming: {stallEnabled} = {}, modernBrowsersOnly} = options

  if (stallEnabled) {
    shakaPlayer.configure('streaming.stallEnabled', true)
  }

  if (!modernBrowsersOnly) {
    shaka.polyfill.installAll()
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
}

export const createShaka = (
  element: HTMLVideoElement,
  options: PlayerAPiOptions = {},
): null | shaka.Player => {
  if (!shaka.Player.isBrowserSupported()) {
    return null
  }

  const shakaPlayer = new shaka.Player(element)

  configPlayer(shakaPlayer, options)
  fixAtmosOrder(shakaPlayer)

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
    const {advanced, servers, licenseUrl, type} = drm

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
    updateDrmRequestFilter(shakaPlayer, options.drm)
    updateDrm(options.drm)
    updateCookies(options.cookies)

    return shakaPlayer.load(url, null)
  }

  const destroy = () => {
    return shakaPlayer.destroy()
  }

  return {destroy, load}
}
