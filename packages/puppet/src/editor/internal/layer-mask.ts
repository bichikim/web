import {isSceneNodeLocked} from './scene-graph'
import {canUsePartAsMask, type PuppetDocument, type PuppetSceneNode} from '../../player'

interface LayerMaskStateOptions {
  readonly document: PuppetDocument
  readonly node: PuppetSceneNode
  readonly maskPartId?: string
}

export const isLayerMaskPickDisabled = (options: LayerMaskStateOptions) =>
  options.maskPartId !== undefined &&
  (options.node.kind !== 'part' ||
    isSceneNodeLocked(options.document, options.node.id) ||
    !canUsePartAsMask({
      maskPartId: options.maskPartId,
      partId: options.node.id,
      parts: options.document.parts,
    }))
