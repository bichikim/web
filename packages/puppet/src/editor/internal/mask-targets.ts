import {canUsePartAsMask, type PuppetDocument} from '../../player'
import {isSceneNodeLocked} from './scene-graph'
import {setPartRenderProperties} from './part-properties'

interface MaskTargetOptions {
  readonly document: PuppetDocument
  readonly maskPartId: string
  readonly targetPartId: string
  readonly checked: boolean
}

export const setMaskTarget = (options: MaskTargetOptions): PuppetDocument | undefined => {
  const {document, maskPartId, targetPartId, checked} = options
  const target = document.parts.find((part) => part.id === targetPartId)
  if (
    target === undefined ||
    isSceneNodeLocked(document, maskPartId) ||
    isSceneNodeLocked(document, targetPartId) ||
    !canUsePartAsMask({maskPartId, partId: targetPartId, parts: document.parts})
  ) {
    return undefined
  }
  const masks = target.properties?.clippingMaskIds ?? []
  return setPartRenderProperties({
    document,
    partId: targetPartId,
    properties: {
      clippingMaskIds: checked
        ? [...new Set([...masks, maskPartId])]
        : masks.filter((id) => id !== maskPartId),
    },
  })
}
