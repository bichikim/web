import {canUsePartAsMask, type PuppetDocument, type PuppetSceneNode} from '../../player'

interface LayerMaskStateOptions {
  readonly document: PuppetDocument
  readonly node: PuppetSceneNode
  readonly targetPartId?: string
}

export const isLayerMaskPickDisabled = (options: LayerMaskStateOptions) =>
  options.targetPartId !== undefined &&
  (options.node.kind !== 'part' ||
    !canUsePartAsMask({
      maskPartId: options.node.id,
      partId: options.targetPartId,
      parts: options.document.parts,
    }))

export const getLayerMaskUsageCount = (document: PuppetDocument, nodeId: string) =>
  document.parts.filter((part) => part.properties?.clippingMaskIds?.includes(nodeId)).length
