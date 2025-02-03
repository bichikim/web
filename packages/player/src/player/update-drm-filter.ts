import shaka from 'shaka-player'
import {DrmOptions} from './types'

/**
 * registerRequestFilter 삭제용 저장소
 */
const DRM_REQUEST_FILTER = Symbol('drm_request_filter')

export const updateDrmRequestFilter = (
  player: shaka.Player,
  drm: Pick<DrmOptions, 'customData' | 'licenseToken'> = {},
) => {
  const {customData, licenseToken} = drm
  const prevDrmRequestFilter = player[DRM_REQUEST_FILTER]
  const networkingEngine = player.getNetworkingEngine()

  if (prevDrmRequestFilter) {
    networkingEngine?.unregisterRequestFilter(prevDrmRequestFilter)
  }

  const filter: shaka.extern.RequestFilter = (type, request) => {
    request.allowCrossSiteCredentials = true

    // 라이센스 채크 하는 것이 아닐때는 스킵
    if (type !== shaka.net.NetworkingEngine.RequestType.LICENSE) {
      return
    }

    // 쿠키를 막고
    request.allowCrossSiteCredentials = false

    if (customData) {
      // 커스컴 팔콘 규격 정보를 넣는다
      request.headers['pallycon-customdata'] = customData
    }

    if (licenseToken) {
      // 라이센스 다른 업체 (내부 서버?)
      request.headers['license-token'] = licenseToken
    }
  }

  networkingEngine?.registerRequestFilter(filter)
  player[DRM_REQUEST_FILTER] = filter
}
