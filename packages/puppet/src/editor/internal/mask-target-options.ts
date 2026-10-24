import {canUsePartAsMask, type PuppetDocument} from '../../player'
import {getSceneNode, isSceneNodeLocked} from './scene-graph'

export const getMaskTargetOptions = (document: PuppetDocument, partId: string) =>
  document.parts.flatMap((part) => {
    if (part.id === partId) {
      return []
    }
    return [
      {
        disabled:
          isSceneNodeLocked(document, part.id) ||
          !canUsePartAsMask({maskPartId: partId, partId: part.id, parts: document.parts}),
        label: getSceneNode(document, part.id)?.name ?? part.id,
        part,
        reason: isSceneNodeLocked(document, part.id) ? '잠긴 레이어' : '순환 참조',
      },
    ]
  })
