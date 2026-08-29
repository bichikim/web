import type {PixiLayerSceneDefinition} from './layer-scene-definition'
import {getLayerMotions} from './motion-definition'
import {validateSceneMotions} from './motion-validation'

export const validateLayerSceneDefinition = (definition: PixiLayerSceneDefinition) => {
  if (definition.width <= 0 || definition.height <= 0) {
    throw new Error(`Invalid scene dimensions: ${definition.id}`)
  }

  const attachments = new Set<string>()
  const effectIds = new Set<string>()
  const layerIds = new Set<string>()

  for (const layer of definition.layers) {
    if (layerIds.has(layer.id)) {
      throw new Error(`Duplicate layer id: ${layer.id}`)
    }

    layerIds.add(layer.id)

    if (layer.attachmentId !== undefined) {
      if (layer.attachmentId.length === 0) {
        throw new Error(`Empty layer attachment id: ${layer.id}`)
      }

      if (attachments.has(layer.attachmentId)) {
        throw new Error(`Duplicate layer attachment: ${layer.attachmentId}`)
      }

      attachments.add(layer.attachmentId)
    }

    if (layer.motion !== undefined && layer.motions !== undefined) {
      throw new Error(`Layer cannot define both motion and motions: ${layer.id}`)
    }

    if (layer.parentAttachmentId !== undefined && !attachments.has(layer.parentAttachmentId)) {
      throw new Error(`Missing parent layer attachment: ${layer.parentAttachmentId}`)
    }

    const motions = getLayerMotions(layer)
    const pivotCount = motions.filter((motion) => motion.kind === 'pivot-rotation').length

    if (pivotCount > 1) {
      throw new Error(`Layer cannot define multiple pivot rotations: ${layer.id}`)
    }

    validateSceneMotions(layer.id, motions, definition)
  }

  for (const effect of definition.effects ?? []) {
    if (effectIds.has(effect.id)) {
      throw new Error(`Duplicate scene effect id: ${effect.id}`)
    }

    effectIds.add(effect.id)

    if (effect.beforeLayerId !== undefined && !layerIds.has(effect.beforeLayerId)) {
      throw new Error(`Missing scene effect layer: ${effect.beforeLayerId}`)
    }
  }
}
