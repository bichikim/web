import type {PuppetParameterBinding, PuppetParameterKeyform} from '../../../player/document'
import type {ReferenceTransform} from './types'

const mapForm = <T extends PuppetParameterKeyform>(form: T, transform: ReferenceTransform): T => ({
  ...form,
  deformers: form.deformers?.map((deformer) => ({
    ...deformer,
    nodeId: transform.rename(deformer.nodeId),
  })),
  parts: form.parts
    .filter((part) => transform.keepPart(part.partId))
    .map((part) => ({
      ...part,
      glue: part.glue
        ?.filter((glue) => transform.keepGlue(glue.id))
        .map((glue) => ({...glue, id: transform.rename(glue.id)})),
      partId: transform.rename(part.partId),
    })),
})

export const mapBindingReferences = (
  binding: PuppetParameterBinding,
  transform: ReferenceTransform,
): PuppetParameterBinding => {
  const common = {
    ...binding,
    id: transform.rename(binding.id),
    influences: binding.influences?.map((influence) => ({
      ...influence,
      parameterId: transform.rename(influence.parameterId),
    })),
    targetDeformerIds: binding.targetDeformerIds?.map(transform.rename),
    targetPartIds: binding.targetPartIds?.filter(transform.keepPart).map(transform.rename),
  }
  if (binding.parameterIds.length === 1) {
    return {
      ...common,
      keyforms: binding.keyforms.map((form) => ({
        ...mapForm(form, transform),
        values: [form.values[0]],
      })),
      parameterIds: [transform.rename(binding.parameterIds[0])],
    }
  }
  return {
    ...common,
    keyforms: binding.keyforms.map((form) => ({
      ...mapForm(form, transform),
      values: [form.values[0], form.values[1]!],
    })),
    parameterIds: [
      transform.rename(binding.parameterIds[0]),
      transform.rename(binding.parameterIds[1]),
    ],
  }
}
