import {describe, expect, test} from 'vitest'

import {
  parseDocumentValue,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPart,
  type PuppetTextureRegion,
} from '../../../player'
import {
  applyTextureAtlas,
  fromAtlasUvs,
  getAtlasImages,
  getRegionKey,
  planTextureAtlas,
  removeTextureAtlas,
  toAtlasUvs,
} from '../texture-atlas'

const part = (id: string, width: number, height: number, src = `${id}.png`): PuppetPart => ({
  id,
  mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0.25, 1], vertices: [0, 0, 10, 0, 0, 10]},
  texture: {height, src, width},
})

const createDocument = (parts: ReadonlyArray<PuppetPart>): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parts,
  scene: {
    roots: parts.map(({id}) => ({id, kind: 'part', locked: false, name: id, visible: true})),
  },
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 100, width: 100},
})

const overlaps = (first: PuppetTextureRegion, second: PuppetTextureRegion, padding: number) =>
  first.x - padding < second.x + second.width + padding &&
  second.x - padding < first.x + first.width + padding &&
  first.y - padding < second.y + second.height + padding &&
  second.y - padding < first.y + first.height + padding

describe('texture atlas', () => {
  test('should pack padded images without overlap, opening pages as they fill', () => {
    const sizes = [
      [60, 40],
      [30, 50],
      [70, 20],
      [10, 10],
      [90, 90],
      [200, 30],
    ] as const
    const images = sizes.map(([width, height], index) => ({height, src: `${index}`, width}))
    const options = {maximumSize: 128, padding: 2}
    const plan = planTextureAtlas(images, options)
    const placed = [...plan.placements.values()]
    expect(placed).toHaveLength(images.length)
    for (const [index, {page, region}] of placed.entries()) {
      const size = plan.pages[page]!
      expect(region.x).toBeGreaterThanOrEqual(options.padding)
      expect(region.y).toBeGreaterThanOrEqual(options.padding)
      expect(region.x + region.width + options.padding).toBeLessThanOrEqual(size.width)
      expect(region.y + region.height + options.padding).toBeLessThanOrEqual(size.height)
      for (const other of placed.slice(index + 1)) {
        expect(other.page === page && overlaps(region, other.region, options.padding)).toBe(false)
      }
    }
    // The 200-pixel image gets a page of its own; the rest need more than one 128 page.
    expect(plan.pages.length).toBeGreaterThan(2)
    expect(plan.pages.some((page) => page.width === 204)).toBe(true)
    expect(plan.pages.filter((page) => page.width <= 128 && page.height <= 128)).toHaveLength(
      plan.pages.length - 1,
    )
  })

  test('should move UVs into a region and back', () => {
    const region = {height: 20, width: 40, x: 8, y: 4}
    const page = {height: 64, width: 128}
    const uvs = [0, 0, 1, 0, 0.25, 1]
    const packed = toAtlasUvs(uvs, region, page)
    expect(packed).toEqual([8 / 128, 4 / 64, 48 / 128, 4 / 64, 18 / 128, 24 / 64])
    fromAtlasUvs(packed, region, page).forEach((value, index) =>
      expect(value).toBeCloseTo(uvs[index]!, 12),
    )
  })

  test('should share one page per image and restore parts from their regions', () => {
    const document = createDocument([
      part('a', 40, 20),
      part('b', 30, 30),
      part('c', 40, 20, 'a.png'),
    ])
    const images = getAtlasImages(document)
    expect(images.map((image) => image.src)).toEqual(['a.png', 'b.png'])
    const plan = planTextureAtlas(images)
    const packed = applyTextureAtlas(document, plan, ['page.png'])
    expect(parseDocumentValue(packed).ok).toBe(true)
    expect(new Set(packed.parts.map((candidate) => candidate.texture.src))).toEqual(
      new Set(['page.png']),
    )
    expect(packed.parts[0]?.texture.region).toEqual(packed.parts[2]?.texture.region)
    // c shares a's image, so it shares a's key too.
    const cropped = new Map(
      packed.parts
        .slice(0, 2)
        .map((candidate) => [getRegionKey(candidate)!, `${candidate.id}-own.png`]),
    )
    const restored = removeTextureAtlas(packed, cropped)
    expect(restored.parts.map((candidate) => candidate.texture)).toEqual([
      {height: 20, src: 'a-own.png', width: 40},
      {height: 30, src: 'b-own.png', width: 30},
      {height: 20, src: 'a-own.png', width: 40},
    ])
    restored.parts[1]!.mesh.uvs.forEach((value, index) =>
      expect(value).toBeCloseTo(document.parts[1]!.mesh.uvs[index]!, 12),
    )
  })

  test('should reject regions outside the texture', () => {
    const withRegion = (region: PuppetTextureRegion) =>
      parseDocumentValue(
        createDocument([
          {...part('a', 40, 20), texture: {height: 20, region, src: 'a', width: 40}},
        ]),
      ).ok
    expect(withRegion({height: 20, width: 40, x: 0, y: 0})).toBe(true)
    expect(withRegion({height: 20, width: 40, x: 1, y: 0})).toBe(false)
    expect(withRegion({height: 0, width: 10, x: 0, y: 0})).toBe(false)
    expect(withRegion({height: 5, width: 10, x: 0.5, y: 0})).toBe(false)
  })
})
