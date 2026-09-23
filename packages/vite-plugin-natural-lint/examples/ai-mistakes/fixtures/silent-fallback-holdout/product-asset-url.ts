const ASSET_ORIGIN = 'https://assets.example.com'

export const getProductAssetUrl = (source: string | URL): URL | null => {
  try {
    const url = source instanceof URL ? source : new URL(source)
    return url.origin === ASSET_ORIGIN ? url : null
  } catch {
    return null
  }
}
