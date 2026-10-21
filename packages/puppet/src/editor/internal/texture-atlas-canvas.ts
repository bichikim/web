import {limitAsync} from 'es-toolkit/promise'
import type {PuppetDocument, PuppetTextureRegion} from '../../player'
import {
  applyTextureAtlas,
  DEFAULT_TEXTURE_ATLAS_OPTIONS,
  getAtlasImages,
  getRegionKey,
  hasTextureAtlas,
  planTextureAtlas,
  removeTextureAtlas,
  type TextureAtlasOptions,
} from './texture-atlas'

// Many large images decoding at once can fail in Chromium; see `initializeRuntimeParts`.
const MAXIMUM_CONCURRENT_DECODES = 4

const loadImage = limitAsync(async (src: string) => {
  const image = new Image()
  image.decoding = 'async'
  image.src = src
  await image.decode()
  return image
}, MAXIMUM_CONCURRENT_DECODES)

const createContext = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) {
    throw new Error('Canvas 2D context is unavailable')
  }
  // Copies and stretched edge rows must not blend neighboring pixels.
  context.imageSmoothingEnabled = false
  return {canvas, context}
}

/** Draws `image` at `region` and repeats its outermost pixels `padding` pixels outwards. */
const drawPadded = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {height, width, x, y}: PuppetTextureRegion,
  padding: number,
) => {
  context.drawImage(image, x, y)
  if (padding === 0) {
    return
  }
  const right = width - 1
  const bottom = height - 1
  // [source x, source y, source width, source height, target x, target y, width, height]
  const strips = [
    [0, 0, width, 1, x, y - padding, width, padding],
    [0, bottom, width, 1, x, y + height, width, padding],
    [0, 0, 1, height, x - padding, y, padding, height],
    [right, 0, 1, height, x + width, y, padding, height],
    [0, 0, 1, 1, x - padding, y - padding, padding, padding],
    [right, 0, 1, 1, x + width, y - padding, padding, padding],
    [0, bottom, 1, 1, x - padding, y + height, padding, padding],
    [right, bottom, 1, 1, x + width, y + height, padding, padding],
  ] as const
  for (const [sx, sy, sw, sh, dx, dy, dw, dh] of strips) {
    context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
  }
}

/**
 * UV가 0..1 안에 있는 파트 이미지를 공유 PNG 페이지에 배치하고 UV를 변환한다.
 * 범위 밖 UV를 쓰는 파트는 가장자리 샘플링을 보존하도록 원본 이미지를 유지한다.
 */
export const packTextureAtlas = async (
  document: PuppetDocument,
  options: TextureAtlasOptions = DEFAULT_TEXTURE_ATLAS_OPTIONS,
): Promise<PuppetDocument> => {
  const source = hasTextureAtlas(document) ? await unpackTextureAtlas(document) : document
  const images = getAtlasImages(source)
  const plan = planTextureAtlas(images, options)
  const loaded = new Map(
    await Promise.all(
      images.map(async (image) => [image.src, await loadImage(image.src)] as const),
    ),
  )
  const pageSources = plan.pages.map((page, index) => {
    const {canvas, context} = createContext(page.width, page.height)
    for (const [src, placement] of plan.placements) {
      const image = loaded.get(src)
      if (placement.page === index && image !== undefined) {
        drawPadded(context, image, placement.region, options.padding)
      }
    }
    return canvas.toDataURL('image/png')
  })
  return applyTextureAtlas(source, plan, pageSources)
}

/** Crops each part's region back into an image of its own. */
export const unpackTextureAtlas = async (document: PuppetDocument): Promise<PuppetDocument> => {
  if (!hasTextureAtlas(document)) {
    return document
  }
  const regions = new Map(
    document.parts.flatMap((part) => {
      const key = getRegionKey(part)
      const {region, src} = part.texture
      return key === undefined || region === undefined ? [] : [[key, {region, src}] as const]
    }),
  )
  const sources = [...new Set([...regions.values()].map(({src}) => src))]
  const images = new Map(
    await Promise.all(sources.map(async (src) => [src, await loadImage(src)] as const)),
  )
  const cropped = new Map(
    [...regions].flatMap(([key, {region, src}]) => {
      const image = images.get(src)
      if (image === undefined) {
        return []
      }
      const {canvas, context} = createContext(region.width, region.height)
      const {height, width, x, y} = region
      context.drawImage(image, x, y, width, height, 0, 0, width, height)
      return [[key, canvas.toDataURL('image/png')] as const]
    }),
  )
  return removeTextureAtlas(document, cropped)
}
