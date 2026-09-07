import {getRequestEvent} from 'solid-js/web'

const TRUSTED_LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost'])

/** Resolves a public asset against the current trusted rendering origin. */
export const getPublicAssetUrl = (pathname: `/${string}`): string => {
  const requestUrlValue = getRequestEvent()?.request.url

  if (requestUrlValue === undefined) {
    return pathname
  }

  const requestUrl = new URL(requestUrlValue)
  const assetOrigin = new URL(import.meta.env.POMO_PUBLIC_ASSET_ORIGIN)
  const canUseLocalOrigin =
    import.meta.env.POMO_ALLOW_LOCAL_ASSET_ORIGIN === 'true' &&
    TRUSTED_LOCAL_HOSTNAMES.has(requestUrl.hostname)
  const trustedOrigin =
    requestUrl.origin === assetOrigin.origin || canUseLocalOrigin ? requestUrl : assetOrigin

  return new URL(pathname, trustedOrigin).href
}
