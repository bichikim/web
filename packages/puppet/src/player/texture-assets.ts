import type {PuppetDocument} from './document'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Stores repeated embedded textures once in the serialized document. */
export const compactDocumentTextures = (document: PuppetDocument) => {
  const occurrences = new Map<string, number>()
  for (const part of document.parts) {
    const source = part.texture.src
    if (source.startsWith('data:')) {
      occurrences.set(source, (occurrences.get(source) ?? 0) + 1)
    }
  }

  const assetIds = new Map<string, string>()
  const textureAssets: Record<string, string> = {}
  const parts = document.parts.map((part) => {
    const source = part.texture.src
    if ((occurrences.get(source) ?? 0) < 2) {
      return part
    }
    let assetId = assetIds.get(source)
    if (assetId === undefined) {
      assetId = `texture-${assetIds.size}`
      assetIds.set(source, assetId)
      textureAssets[assetId] = source
    }
    const {src: _src, ...texture} = part.texture
    return {...part, texture: {...texture, assetId}}
  })

  return assetIds.size === 0 ? {...document, parts} : {...document, parts, textureAssets}
}

/** Resolves serialized texture references before document validation. */
export const expandDocumentTextureAssets = (value: unknown): unknown => {
  if (!isRecord(value) || !Object.hasOwn(value, 'textureAssets')) {
    return value
  }
  const {textureAssets, ...document} = value
  if (
    !isRecord(textureAssets) ||
    !Object.values(textureAssets).every(
      (source) => typeof source === 'string' && source.length > 0,
    ) ||
    !Array.isArray(document.parts)
  ) {
    return null
  }

  const parts = document.parts.map((part: unknown) => {
    if (!isRecord(part) || !isRecord(part.texture)) {
      return part
    }
    const {assetId, ...texture} = part.texture
    if (assetId === undefined) {
      return part
    }
    if (
      typeof assetId !== 'string' ||
      Object.hasOwn(texture, 'src') ||
      !Object.hasOwn(textureAssets, assetId)
    ) {
      return null
    }
    return {...part, texture: {...texture, src: textureAssets[assetId]}}
  })
  return parts.includes(null) ? null : {...document, parts}
}
