import type {PuppetDocument, PuppetPart, PuppetTextureRegion} from '../../player'

export interface TextureAtlasOptions {
  /** Largest page side in pixels; a larger image gets a page of its own. */
  readonly maximumSize: number
  /** Pixels around each image, filled with its edge pixels to match clamp-to-edge sampling. */
  readonly padding: number
}

export const DEFAULT_TEXTURE_ATLAS_OPTIONS: TextureAtlasOptions = {maximumSize: 2048, padding: 2}

export interface AtlasImage {
  readonly height: number
  readonly src: string
  readonly width: number
}

export interface AtlasPlacement {
  readonly page: number
  readonly region: PuppetTextureRegion
}

export interface TextureAtlasPlan {
  readonly pages: ReadonlyArray<{readonly height: number; readonly width: number}>
  /** By image source. */
  readonly placements: ReadonlyMap<string, AtlasPlacement>
}

/** Each distinct image of the document's parts. */
export const getAtlasImages = (document: PuppetDocument): ReadonlyArray<AtlasImage> => {
  const images = new Map<string, AtlasImage>()
  for (const {texture} of document.parts) {
    images.set(texture.src, {height: texture.height, src: texture.src, width: texture.width})
  }
  return [...images.values()]
}

interface Shelf {
  readonly page: number
  readonly top: number
  height: number
  right: number
}

/**
 * Shelf packing: images, tallest first, fill rows left to right; a row that runs out of width
 * starts a new one below, and a page that runs out of height starts a new page. Pages are as
 * small as their content.
 */
export const planTextureAtlas = (
  images: ReadonlyArray<AtlasImage>,
  options: TextureAtlasOptions = DEFAULT_TEXTURE_ATLAS_OPTIONS,
): TextureAtlasPlan => {
  const {maximumSize, padding} = options
  const pages: Array<{height: number; width: number}> = []
  const shelves: Array<Shelf> = []
  const placements = new Map<string, AtlasPlacement>()
  const place = (shelf: Shelf, image: AtlasImage) => {
    const page = pages[shelf.page]!
    placements.set(image.src, {
      page: shelf.page,
      region: {
        height: image.height,
        width: image.width,
        x: shelf.right + padding,
        y: shelf.top + padding,
      },
    })
    shelf.right += image.width + 2 * padding
    shelf.height = Math.max(shelf.height, image.height + 2 * padding)
    page.width = Math.max(page.width, shelf.right)
    page.height = Math.max(page.height, shelf.top + shelf.height)
  }
  const tallestFirst = [...images].sort(
    (first, second) => second.height - first.height || second.width - first.width,
  )
  // Pages holding one image larger than the maximum size.
  const oversized = new Set<number>()
  /** A new row below the last one, or on a new page when the last page is full. */
  const openShelf = (width: number, height: number) => {
    const last = shelves.at(-1)
    const page = pages.length - 1
    const below = last === undefined ? undefined : last.top + last.height
    const fits = width <= maximumSize && height <= maximumSize
    const opened =
      fits &&
      below !== undefined &&
      last?.page === page &&
      !oversized.has(page) &&
      below + height <= maximumSize
        ? {height: 0, page, right: 0, top: below}
        : {height: 0, page: pages.push({height: 0, width: 0}) - 1, right: 0, top: 0}
    if (!fits) {
      oversized.add(opened.page)
    }
    shelves.push(opened)
    return opened
  }
  for (const image of tallestFirst) {
    const width = image.width + 2 * padding
    const height = image.height + 2 * padding
    const shelf = shelves.find(
      (candidate) =>
        !oversized.has(candidate.page) &&
        candidate.right + width <= maximumSize &&
        height <= candidate.height,
    )
    place(shelf ?? openShelf(width, height), image)
  }
  return {pages, placements}
}

const mapUvs = (
  uvs: ReadonlyArray<number>,
  map: (value: number, axis: 0 | 1) => number,
): ReadonlyArray<number> => uvs.map((value, index) => map(value, index % 2 === 0 ? 0 : 1))

/** UVs over a part's own image moved into its region of a page of `width`×`height`. */
export const toAtlasUvs = (
  uvs: ReadonlyArray<number>,
  region: PuppetTextureRegion,
  page: {readonly height: number; readonly width: number},
) =>
  mapUvs(uvs, (value, axis) =>
    axis === 0
      ? (region.x + value * region.width) / page.width
      : (region.y + value * region.height) / page.height,
  )

/** The inverse of {@link toAtlasUvs}. */
export const fromAtlasUvs = (
  uvs: ReadonlyArray<number>,
  region: PuppetTextureRegion,
  page: {readonly height: number; readonly width: number},
) =>
  mapUvs(uvs, (value, axis) =>
    axis === 0
      ? (value * page.width - region.x) / region.width
      : (value * page.height - region.y) / region.height,
  )

/** Points every part at its image's region of a page, whose sources are `pageSources`. */
export const applyTextureAtlas = (
  document: PuppetDocument,
  plan: TextureAtlasPlan,
  pageSources: ReadonlyArray<string>,
): PuppetDocument => ({
  ...document,
  parts: document.parts.map((part): PuppetPart => {
    const placement = plan.placements.get(part.texture.src)
    const page = placement === undefined ? undefined : plan.pages[placement.page]
    const src = placement === undefined ? undefined : pageSources[placement.page]
    if (placement === undefined || page === undefined || src === undefined) {
      return part
    }
    return {
      ...part,
      mesh: {...part.mesh, uvs: toAtlasUvs(part.mesh.uvs, placement.region, page)},
      texture: {height: page.height, region: placement.region, src, width: page.width},
    }
  }),
})

/** The key of a part's own image within its atlas page. */
export const getRegionKey = (part: PuppetPart) => {
  const {region, src} = part.texture
  return region === undefined
    ? undefined
    : `${region.x},${region.y},${region.width},${region.height}\u0000${src}`
}

/**
 * Gives every part with a region its own image again, from `croppedSources` by
 * {@link getRegionKey}. Parts without a region are kept.
 */
export const removeTextureAtlas = (
  document: PuppetDocument,
  croppedSources: ReadonlyMap<string, string>,
): PuppetDocument => ({
  ...document,
  parts: document.parts.map((part): PuppetPart => {
    const key = getRegionKey(part)
    const src = key === undefined ? undefined : croppedSources.get(key)
    const {region} = part.texture
    if (src === undefined || region === undefined) {
      return part
    }
    return {
      ...part,
      mesh: {...part.mesh, uvs: fromAtlasUvs(part.mesh.uvs, region, part.texture)},
      texture: {height: region.height, src, width: region.width},
    }
  }),
})

export const hasTextureAtlas = (document: PuppetDocument) =>
  document.parts.some((part) => part.texture.region !== undefined)
