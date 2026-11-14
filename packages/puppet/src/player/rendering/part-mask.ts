import {Container, MaskFilter, MeshSimple, type Renderer, RenderTexture, Sprite} from 'pixi.js'
import type {PuppetDocument} from '../document'
import type {PartMaskRenderPlan, PartRenderPlan} from '../internal/render-plan'
import type {RuntimePart, RuntimePartMask} from './types'

const MASK_TEXTURE_BLOCK_SIZE = 64

interface CreateRuntimePartMaskOptions {
  /** Matches the owning renderer. Omitted, preserve multisampling. */
  readonly antialias?: boolean
  readonly document: PuppetDocument
  readonly plan: PartMaskRenderPlan
  readonly partById: ReadonlyMap<string, RuntimePart>
}

export const createRuntimePartMask = (options: CreateRuntimePartMaskOptions): RuntimePartMask => {
  const container = new Container()
  const meshes = options.plan.sources.flatMap((sourcePlan) => {
    const sourcePart = options.document.parts.find((part) => part.id === sourcePlan.partId)
    const sourceRuntimePart = options.partById.get(sourcePlan.partId)
    if (sourcePart === undefined || sourceRuntimePart === undefined) {
      return []
    }

    const mesh = new MeshSimple({
      indices: new Uint32Array(sourcePart.mesh.indices),
      texture: sourceRuntimePart.mesh.texture,
      topology: 'triangle-list',
      uvs: new Float32Array(sourcePart.mesh.uvs),
      vertices: new Float32Array(sourceRuntimePart.vertices),
    })
    mesh.renderable = sourcePart.mesh.indices.length > 0
    const mask =
      sourcePlan.mask === undefined
        ? undefined
        : createRuntimePartMask({
            antialias: options.antialias,
            document: options.document,
            partById: options.partById,
            plan: sourcePlan.mask,
          })

    if (mask !== undefined) {
      container.addChild(mask.sprite)
      mask.filter.inverse = sourcePlan.invertedMask
      mesh.filters = [mask.filter]
    }
    container.addChild(mesh)
    return [{mask, mesh, sourcePartId: sourcePlan.partId}]
  })

  const texture = RenderTexture.create({
    antialias: options.antialias ?? true,
    dynamic: true,
    height: 1,
    width: 1,
  })
  const sprite = new Sprite(texture)
  sprite.renderable = false
  const filter = new MaskFilter({
    antialias: 'inherit',
    channel: 'alpha',
    resolution: 'inherit',
    sprite,
  })
  // Masks only change alpha; offscreen pixels cannot affect the visible result. Clipping also
  // keeps subsequent backdrop filters from copying outside their parent render target.
  filter.clipToViewport = true
  return {container, filter, meshes, sprite, texture}
}

interface VertexBounds {
  /** `undefined` without coordinates on that axis. */
  readonly left: number | undefined
  readonly right: number
  readonly top: number | undefined
  readonly bottom: number
}

/**
 * Bounds of interleaved x, y vertex arrays. Loops instead of spreading into `Math.min`, which
 * exceeds the call stack for large meshes and allocates per frame.
 */
export const getVertexBounds = (vertexSets: ReadonlyArray<ArrayLike<number>>): VertexBounds => {
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  let horizontalCount = 0
  let verticalCount = 0
  for (const vertices of vertexSets) {
    for (let index = 0; index < vertices.length; index += 1) {
      const coordinate = vertices[index]!
      if (index % 2 === 0) {
        left = Math.min(left, coordinate)
        right = Math.max(right, coordinate)
        horizontalCount += 1
      } else {
        top = Math.min(top, coordinate)
        bottom = Math.max(bottom, coordinate)
        verticalCount += 1
      }
    }
  }
  return {
    bottom,
    left: horizontalCount > 0 ? left : undefined,
    right,
    top: verticalCount > 0 ? top : undefined,
  }
}

/** The visible rectangle in document coordinates, used to limit mask rasterization. */
export interface MaskViewport {
  /** Left edge in document coordinates. */
  readonly x: number
  /** Top edge in document coordinates. */
  readonly y: number
  /** Visible width in document units. */
  readonly width: number
  /** Visible height in document units. */
  readonly height: number
}

interface RenderRuntimeMaskOptions {
  /** Borrowed mask resources to update; the caller retains ownership. */
  readonly mask: RuntimePartMask
  /** Borrowed renderer that draws the mask into its texture. */
  readonly renderer: Renderer
  /** Physical texture pixels per document unit. */
  readonly resolution: number
  /** Receiving meshes or layer members in document coordinates. */
  readonly vertexSets: ReadonlyArray<ArrayLike<number>>
  /** Visible document rectangle. Omitted, the entire receiving bounds are rasterized. */
  readonly viewport?: MaskViewport
}

const transparentMasks = new WeakMap<Renderer, WeakSet<RuntimePartMask>>()

/** Whether its source geometry guarantees a transparent mask, independent of receiver inversion. */
export const isRuntimeMaskEmpty = (mask: RuntimePartMask): boolean =>
  mask.meshes.every(
    (source) =>
      source.mesh.geometry.indices.length === 0 ||
      (source.mask !== undefined && !source.mask.filter.inverse && isRuntimeMaskEmpty(source.mask)),
  )

const renderEmptyMask = (mask: RuntimePartMask, renderer: Renderer) => {
  let initialized = transparentMasks.get(renderer)
  if (initialized === undefined) {
    initialized = new WeakSet()
    transparentMasks.set(renderer, initialized)
  }
  const changed =
    mask.texture.width !== 1 || mask.texture.height !== 1 || mask.texture.source.resolution !== 1
  if (changed) {
    mask.texture.resize(1, 1, 1)
    mask.texture.update()
  }
  mask.sprite.position.set(0, 0)
  if (changed || !initialized.has(mask)) {
    const empty = new Container()
    try {
      renderer.render({clear: true, container: empty, target: mask.texture})
      initialized.add(mask)
    } finally {
      empty.destroy()
    }
  }
}

/** Rasterizes one mask after its nested masks have already been prepared. */
export const renderMaskTexture = (options: RenderRuntimeMaskOptions) => {
  const {mask, renderer, resolution, vertexSets, viewport} = options
  mask.sprite.texture = mask.texture
  if (isRuntimeMaskEmpty(mask)) {
    renderEmptyMask(mask, renderer)
    return
  }
  transparentMasks.get(renderer)?.delete(mask)
  // Align in physical pixels so the margin stays small even when zoomed far into the model.
  const bounds = getVertexBounds(vertexSets)
  const left =
    Math.floor(Math.max(bounds.left ?? 0, viewport?.x ?? -Infinity) * resolution) / resolution
  const top =
    Math.floor(Math.max(bounds.top ?? 0, viewport?.y ?? -Infinity) * resolution) / resolution
  const right = Math.min(
    bounds.right,
    viewport === undefined ? Infinity : viewport.x + viewport.width,
  )
  const bottom = Math.min(
    bounds.bottom,
    viewport === undefined ? Infinity : viewport.y + viewport.height,
  )
  const capacity = (size: number) =>
    (Math.ceil(Math.max(1, size * resolution) / MASK_TEXTURE_BLOCK_SIZE) *
      MASK_TEXTURE_BLOCK_SIZE) /
    resolution
  const sameResolution = mask.texture.source.resolution === resolution
  // Moving bounds retain their active capacity; zoom changes and inactive groups release it.
  const width = Math.max(sameResolution ? mask.texture.width : 0, capacity(right - left))
  const height = Math.max(sameResolution ? mask.texture.height : 0, capacity(bottom - top))
  if (
    mask.texture.width !== width ||
    mask.texture.height !== height ||
    mask.texture.source.resolution !== resolution
  ) {
    mask.texture.resize(width, height, resolution)
    // PixiJS emits no resize when only resolution changes and physical capacity stays equal.
    // Refresh the logical frame and UVs as well, or the mask uses its previous zoom's extent.
    mask.texture.update()
  }
  mask.sprite.position.set(left, top)
  mask.container.position.set(-left, -top)
  renderer.render({
    clear: true,
    container: mask.container,
    target: mask.texture,
  })
}

/** Renders a mask and its dependencies, clipped to `viewport` when supplied. */
export const renderRuntimeMask = (options: RenderRuntimeMaskOptions) => {
  for (const source of options.mask.meshes) {
    if (source.mask !== undefined) {
      renderRuntimeMask({...options, mask: source.mask, vertexSets: [source.mesh.vertices]})
    }
  }
  renderMaskTexture(options)
}

export const destroyRuntimeMask = (mask: RuntimePartMask) => {
  for (const source of mask.meshes) {
    if (source.mask !== undefined) {
      destroyRuntimeMask(source.mask)
    }
  }
  mask.sprite.destroy()
  mask.texture.destroy(true)
  mask.filter.destroy()
  mask.container.destroy({children: true})
}

interface UpdateRuntimeMaskOptions {
  readonly mask: RuntimePartMask
  readonly planById: ReadonlyMap<string, PartRenderPlan>
  readonly partById: ReadonlyMap<string, RuntimePart>
}

export const updateRuntimeMask = (options: UpdateRuntimeMaskOptions) => {
  for (const maskMesh of options.mask.meshes) {
    const sourcePart = options.partById.get(maskMesh.sourcePartId)
    if (sourcePart !== undefined) {
      maskMesh.mesh.vertices = sourcePart.vertices
    }
    if (maskMesh.mask !== undefined) {
      updateRuntimeMask({...options, mask: maskMesh.mask})
      maskMesh.mask.filter.inverse =
        options.planById.get(maskMesh.sourcePartId)?.properties.invertedMask ?? false
    }
  }
}
