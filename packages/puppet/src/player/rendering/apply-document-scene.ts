import type {Container} from 'pixi.js'
import type {PartRenderPlan} from '../internal/render-plan'
import type {RuntimePart} from './types'

export const applyDocumentScene = (
  plans: ReadonlyArray<PartRenderPlan>,
  partById: ReadonlyMap<string, RuntimePart>,
  root: Container,
) => {
  for (const plan of plans) {
    const runtimePart = partById.get(plan.partId)

    if (runtimePart !== undefined) {
      runtimePart.mesh.visible = plan.visible
      if (plan.render) {
        if (runtimePart.mask !== undefined) {
          root.addChild(runtimePart.mask.sprite)
          runtimePart.mask.filter.inverse = plan.properties.invertedMask
        }
        root.addChild(runtimePart.mesh)
      }
    }
  }
}
