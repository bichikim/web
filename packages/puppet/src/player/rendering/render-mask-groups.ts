import type {Renderer} from 'pixi.js'
import {type MaskViewport, renderMaskTexture} from './part-mask'
import type {RuntimePartMask} from './types'

export interface MaskRenderRequest {
  /** Borrowed receiver resources; each retains its own filter and owned texture. */
  readonly mask: RuntimePartMask
  /** Current receiver coordinates in document space. */
  readonly vertexSets: ReadonlyArray<ArrayLike<number>>
}

interface RenderMaskGroupsOptions {
  /** Borrowed renderer used for this frame's mask passes. */
  readonly renderer: Renderer
  /** Visible receivers from one runtime document whose masks must be refreshed this frame. */
  readonly requests: ReadonlyArray<MaskRenderRequest>
  /** Physical texture pixels per document unit. */
  readonly resolution: number
  /** Visible document rectangle; omitted, rasterize the complete receiver bounds. */
  readonly viewport?: MaskViewport
}

const previousMasks = new WeakMap<Renderer, ReadonlySet<RuntimePartMask>>()

// Receiver inversion belongs to its filter. Nested inversion changes the shared pixels.
const maskKey = (mask: RuntimePartMask): string =>
  JSON.stringify(
    mask.meshes.map((source) => [
      source.sourcePartId,
      source.mask === undefined ? null : [source.mask.filter.inverse, maskKey(source.mask)],
    ]),
  )

/** Rasterizes identical mask sources once over the union of their visible receivers. */
export const renderMaskGroups = (options: RenderMaskGroupsOptions): void => {
  const groups = new Map<string, Array<MaskRenderRequest>>()
  const collect = (request: MaskRenderRequest) => {
    const key = maskKey(request.mask)
    const group = groups.get(key)
    if (group === undefined) {
      groups.set(key, [request])
    } else {
      group.push(request)
    }
    for (const source of request.mask.meshes) {
      if (source.mask !== undefined) {
        collect({mask: source.mask, vertexSets: [source.mesh.vertices]})
      }
    }
  }
  options.requests.forEach(collect)
  const rendered = new Set<RuntimePartMask>()
  const completed = new Set<string>()
  const renderGroup = (key: string) => {
    if (completed.has(key)) {
      return
    }
    const requests = groups.get(key)!
    const {mask} = requests[0]!
    for (const source of mask.meshes) {
      if (source.mask !== undefined) {
        renderGroup(maskKey(source.mask))
      }
    }
    completed.add(key)
    rendered.add(mask)
    // A previous frame may have borrowed another receiver's texture. Restore the owned one.
    mask.sprite.texture = mask.texture
    renderMaskTexture({
      mask,
      renderer: options.renderer,
      resolution: options.resolution,
      vertexSets: requests.flatMap((request) => request.vertexSets),
      viewport: options.viewport,
    })
    for (const request of requests) {
      request.mask.sprite.texture = mask.texture
      request.mask.sprite.position.copyFrom(mask.sprite.position)
    }
  }
  for (const key of groups.keys()) {
    renderGroup(key)
  }
  // Animated visibility can change the representative. Retain only this frame's large targets.
  for (const mask of previousMasks.get(options.renderer) ?? []) {
    if (!rendered.has(mask) && !mask.texture.destroyed) {
      mask.texture.resize(1, 1, 1)
      mask.texture.update()
    }
  }
  previousMasks.set(options.renderer, rendered)
}
