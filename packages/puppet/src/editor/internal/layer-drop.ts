import type {PuppetSceneNode} from '../../player'
import type {SceneNodeDropPosition} from './scene-graph'

const GROUP_DROP_START = 0.25
const DROP_MIDPOINT = 0.5
const GROUP_DROP_END = 0.75

export interface LayerDropTarget {
  readonly nodeId: string | null
  readonly position: SceneNodeDropPosition
}

export const getLayerDropPosition = (
  node: PuppetSceneNode,
  bounds: DOMRect,
  clientY: number,
): SceneNodeDropPosition => {
  if (bounds.height <= 0) {
    return node.kind === 'group' ? 'inside' : 'before'
  }

  const progress = (clientY - bounds.top) / bounds.height
  if (node.kind === 'group' && progress >= GROUP_DROP_START && progress <= GROUP_DROP_END) {
    return 'inside'
  }

  return progress < DROP_MIDPOINT ? 'before' : 'after'
}
