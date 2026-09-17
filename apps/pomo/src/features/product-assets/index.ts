export const POMO_R2_ASSET_HOST = 'https://storage.pomofi.io/'

const POMO_R2_ASSET_ORIGIN = new URL(POMO_R2_ASSET_HOST).origin
const STEAM_ASSET_ROOT = '/assets-steam'
const STEAM_AUDIO_ASSET_ROOT = `${STEAM_ASSET_ROOT}/audio`

export type PomoAssetInput = string | URL

const getSourceUrl = (source: PomoAssetInput): string =>
  source instanceof URL ? source.href : source

const getPomoR2AssetUrl = (source: PomoAssetInput): URL | null => {
  try {
    const url = new URL(getSourceUrl(source))
    return url.origin === POMO_R2_ASSET_ORIGIN ? url : null
  } catch {
    return null
  }
}

export const isPomoSteamRuntime = (): boolean =>
  import.meta.env.VITE_POMO_DISTRIBUTION_TARGET === 'steam'

export const isPomoR2AssetUrl = (source: PomoAssetInput): boolean =>
  getPomoR2AssetUrl(source) !== null

export const isPomoAssetBundled = (source: PomoAssetInput): boolean =>
  isPomoSteamRuntime() && isPomoR2AssetUrl(source)

const getSteamAssetPath = (pathname: string): string =>
  pathname.startsWith('/tracks/')
    ? `${STEAM_AUDIO_ASSET_ROOT}${pathname}`
    : `${STEAM_ASSET_ROOT}${pathname}`

/** Resolves a product asset to the Steam bundle while retaining R2 elsewhere. */
export const resolvePomoAssetUrl = (source: PomoAssetInput): string => {
  const sourceUrl = getSourceUrl(source)
  const r2AssetUrl = getPomoR2AssetUrl(source)

  if (!isPomoSteamRuntime() || r2AssetUrl === null) {
    return sourceUrl
  }

  return `${getSteamAssetPath(r2AssetUrl.pathname)}${r2AssetUrl.search}${r2AssetUrl.hash}`
}

/** Adapts model GET requests to the packaged product asset URL when running on Steam. */
export const createPomoAssetFetcher =
  (fetcher: typeof fetch): typeof fetch =>
  async (input, init) => {
    const source = input instanceof Request ? input.url : input instanceof URL ? input.href : input
    const resolvedUrl = resolvePomoAssetUrl(source)

    if (resolvedUrl === source) {
      return fetcher(input, init)
    }

    return input instanceof Request
      ? fetcher(new Request(resolvedUrl, input), init)
      : fetcher(resolvedUrl, init)
  }
