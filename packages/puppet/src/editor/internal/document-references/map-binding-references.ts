import {
  isThreeDimensionalParameterBinding,
  isTwoDimensionalParameterBinding,
} from '../../../deformation'
import type {PuppetParameterBinding, PuppetParameterKeyform} from '../../../player/document'
import type {ReferenceTransform} from './types'

const mapForm = <T extends PuppetParameterKeyform>(form: T, transform: ReferenceTransform): T => ({
  ...form,
  deformers: form.deformers?.map((deformer) => ({
    ...deformer,
    nodeId: transform.rename(deformer.nodeId),
  })),
  groups: form.groups?.map((group) => ({...group, groupId: transform.rename(group.groupId)})),
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
    targetGroupIds: binding.targetGroupIds?.map(transform.rename),
    targetPartIds: binding.targetPartIds?.filter(transform.keepPart).map(transform.rename),
  }
  const {rename} = transform
  if (isThreeDimensionalParameterBinding(binding)) {
    const [x, y, z] = binding.parameterIds
    return {
      ...common,
      keyforms: binding.keyforms.map((form) => mapForm(form, transform)),
      parameterIds: [rename(x), rename(y), rename(z)],
    }
  }
  if (isTwoDimensionalParameterBinding(binding)) {
    const [x, y] = binding.parameterIds
    return {
      ...common,
      keyforms: binding.keyforms.map((form) => mapForm(form, transform)),
      parameterIds: [rename(x), rename(y)],
    }
  }
  return {
    ...common,
    keyforms: binding.keyforms.map((form) => mapForm(form, transform)),
    parameterIds: [rename(binding.parameterIds[0])],
  }
}
