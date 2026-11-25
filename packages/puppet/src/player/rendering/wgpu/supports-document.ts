import type {PuppetDocument} from '../../document'
import {getPartRenderFrame} from '../../internal/render-plan'
/** Scenes outside the implemented GPU composition retain their existing renderer. */
export const supportsWgpuDocument = (document: PuppetDocument): boolean => {
  if (document.parts.some((part) => part.spatial !== undefined)) {
    return false
  }
  const frame = getPartRenderFrame(document)
  return (
    frame.layers.size === 0 &&
    frame.plans.every(
      (plan) =>
        plan.properties.alphaBlendMode === 'over' &&
        (plan.properties.blendMode === 'normal' ||
          plan.properties.blendMode === 'multiply-compatible'),
    )
  )
}
