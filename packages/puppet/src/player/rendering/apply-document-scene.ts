import type {Container} from 'pixi.js'
import type {PartRenderFrame} from '../internal/render-plan'
import type {RuntimeLayer, RuntimePart} from './types'

export interface ApplyDocumentSceneOptions {
  readonly frame: Pick<PartRenderFrame, 'layers' | 'plans'>
  readonly layerById: ReadonlyMap<string, RuntimeLayer>
  readonly partById: ReadonlyMap<string, RuntimePart>
  readonly root: Container
}

/**
 * Arranges the rendered parts in paint order, each inside the container of its innermost layer.
 * Appending moves an existing child to the end, so every container ends in paint order. A layer
 * container is placed where its first member is painted; a mask sprite precedes the object it
 * masks so that both share a transform.
 */
export const applyDocumentScene = (options: ApplyDocumentSceneOptions) => {
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
          parent.addChild(layer.mask.sprite)
          layer.mask.filter.inverse = plan?.properties.invertedMask ?? false
        }
        parent.addChild(layer.container)
      }
      return layer.container
    }, options.root)

  for (const plan of options.frame.plans) {
    const runtimePart = options.partById.get(plan.partId)
    if (runtimePart !== undefined) {
      runtimePart.mesh.visible = plan.visible
    }
    if (runtimePart !== undefined && plan.render) {
      const parent = containerOf(plan.layerIds)
      if (runtimePart.mask !== undefined) {
        parent.addChild(runtimePart.mask.sprite)
        runtimePart.mask.filter.inverse = plan.properties.invertedMask
      }
      parent.addChild(runtimePart.mesh)
    }
  }
}
