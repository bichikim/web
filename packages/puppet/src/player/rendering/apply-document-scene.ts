import type {Container} from 'pixi.js'
import {isRuntimeMaskEmpty} from './part-mask'
import type {PartRenderFrame, PartRenderPlan} from '../internal/render-plan'
import type {RuntimeLayer, RuntimePart} from './types'

export interface ApplyDocumentSceneOptions {
  readonly frame: Pick<PartRenderFrame, 'layers' | 'plans'>
  readonly layerById: ReadonlyMap<string, RuntimeLayer>
  readonly partById: ReadonlyMap<string, RuntimePart>
  readonly root: Container
}

/** Only elide normal-over receivers whose clipping is provably transparent. */
const isMaskedOut = (plan: PartRenderPlan, part: RuntimePart): boolean =>
  part.mask !== undefined &&
  !plan.properties.invertedMask &&
  plan.properties.alphaBlendMode === 'over' &&
  plan.properties.blendMode === 'normal' &&
  isRuntimeMaskEmpty(part.mask)

/**
 * Arranges the rendered parts in paint order, each inside the container of its innermost layer.
 * Only changed child order is applied, preserving cached render instructions. A layer
 * container is placed where its first member is painted; a mask sprite precedes the object it
 * masks so that both share a transform.
 */
export const applyDocumentScene = (options: ApplyDocumentSceneOptions) => {
  const childrenByParent = new Map<Container, Array<Container>>()
  const placeChild = (parent: Container, child: Container) => {
    const children = childrenByParent.get(parent)
    if (children === undefined) {
      childrenByParent.set(parent, [child])
    } else {
      children.push(child)
    }
  }
  const placedLayerIds = new Set<string>()
  const containerOf = (layerIds: ReadonlyArray<string>) =>
    layerIds.reduce<Container>((parent, layerId) => {
      const layer = options.layerById.get(layerId)
      if (layer === undefined) {
        return parent
      }
      if (!placedLayerIds.has(layerId)) {
        placedLayerIds.add(layerId)
        const plan = options.frame.layers.get(layerId)
        layer.container.visible = plan?.visible ?? false
        if (layer.mask !== undefined) {
          placeChild(parent, layer.mask.sprite)
          layer.mask.filter.inverse = plan?.properties.invertedMask ?? false
        }
        placeChild(parent, layer.container)
      }
      return layer.container
    }, options.root)

  for (const plan of options.frame.plans) {
    const runtimePart = options.partById.get(plan.partId)
    if (runtimePart !== undefined) {
      runtimePart.mesh.visible = plan.visible
      // Pixi's indexed batch draw treats a zero count as the entire shared buffer.
      // Keep auxiliary parts in the scene, but never submit their empty geometry.
      runtimePart.mesh.renderable =
        runtimePart.mesh.geometry.indices.length > 0 && !isMaskedOut(plan, runtimePart)
    }
    if (runtimePart !== undefined && plan.render) {
      const parent = containerOf(plan.layerIds)
      if (runtimePart.mask !== undefined) {
        placeChild(parent, runtimePart.mask.sprite)
        runtimePart.mask.filter.inverse = plan.properties.invertedMask
      }
      placeChild(parent, runtimePart.mesh)
    }
  }
  for (const [parent, children] of childrenByParent) {
    // Appending keeps retained children ahead of this frame's painted children.
    const offset = parent.children.length - children.length
    if (children.some((child, index) => parent.children[offset + index] !== child)) {
      for (const child of children) {
        parent.addChild(child)
      }
    }
  }
}
