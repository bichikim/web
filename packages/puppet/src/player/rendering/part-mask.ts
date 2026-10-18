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

export const renderRuntimeMask = (
  mask: RuntimePartMask,
  renderer: Renderer,
  resolution: number,
  vertices: MeshSimple['vertices'],
) => {
  for (const source of mask.meshes) {
    if (source.mask !== undefined) {
      renderRuntimeMask(source.mask, renderer, resolution, source.mesh.vertices)
    }
  }
  // Only the receiving mesh can display this mask; retain capacity while its bounds animate.
  const horizontal = vertices.filter((_, index) => index % 2 === 0)
  const vertical = vertices.filter((_, index) => index % 2 === 1)
  const left = Math.floor(horizontal.length > 0 ? Math.min(...horizontal) : 0)
  const top = Math.floor(vertical.length > 0 ? Math.min(...vertical) : 0)
  const width = Math.max(
    mask.texture.width,
    Math.ceil((Math.max(left + 1, ...horizontal) - left) / MASK_TEXTURE_BLOCK_SIZE) *
      MASK_TEXTURE_BLOCK_SIZE,
  )
  const height = Math.max(
    mask.texture.height,
    Math.ceil((Math.max(top + 1, ...vertical) - top) / MASK_TEXTURE_BLOCK_SIZE) *
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
