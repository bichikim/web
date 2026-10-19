import {
  Container,
  MaskFilter,
  Matrix,
  MeshSimple,
  type Renderer,
  RenderTexture,
  Sprite,
} from 'pixi.js'
import type {PuppetDocument} from '../document'
import type {PartMaskRenderPlan, PartRenderPlan} from '../internal/render-plan'
import type {RuntimePart, RuntimePartMask} from './types'

const MASK_TEXTURE_BLOCK_SIZE = 64

interface CreateRuntimePartMaskOptions {
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
    const mask =
      sourcePlan.mask === undefined
        ? undefined
        : createRuntimePartMask({
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

  const texture = RenderTexture.create({antialias: true, dynamic: true, height: 1, width: 1})
  const sprite = new Sprite(texture)
  sprite.renderable = false
  const filter = new MaskFilter({channel: 'alpha', sprite})
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

/** Renders the mask over the bounds of `vertexSets`, the receiving mesh or layer members. */
export const renderRuntimeMask = (
  mask: RuntimePartMask,
  renderer: Renderer,
  resolution: number,
  vertexSets: ReadonlyArray<ArrayLike<number>>,
) => {
  for (const source of mask.meshes) {
    if (source.mask !== undefined) {
      renderRuntimeMask(source.mask, renderer, resolution, [source.mesh.vertices])
    }
  }
  // Only the receiving mesh can display this mask; retain capacity while its bounds animate.
  const bounds = getVertexBounds(vertexSets)
  const left = Math.floor(bounds.left ?? 0)
  const top = Math.floor(bounds.top ?? 0)
  const width = Math.max(
    mask.texture.width,
    Math.ceil((Math.max(left + 1, bounds.right) - left) / MASK_TEXTURE_BLOCK_SIZE) *
      MASK_TEXTURE_BLOCK_SIZE,
  )
  const height = Math.max(
    mask.texture.height,
    Math.ceil((Math.max(top + 1, bounds.bottom) - top) / MASK_TEXTURE_BLOCK_SIZE) *
      MASK_TEXTURE_BLOCK_SIZE,
  )
  if (
    mask.texture.width !== width ||
    mask.texture.height !== height ||
    mask.texture.source.resolution !== resolution
  ) {
    mask.texture.resize(width, height, resolution)
  }
  mask.sprite.position.set(left, top)
  renderer.render({
    clear: true,
    container: mask.container,
    target: mask.texture,
    transform: new Matrix().translate(-left, -top),
  })
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
