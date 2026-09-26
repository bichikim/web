import {composeParameterGlue, sampleParameterGlue} from '../../deformation/parameter-glue'
import {
  composeParameterPartProperties,
  composeParameterScene,
  composeParameterVertices,
  createDeformerKeyform,
  type PuppetParameterValueMap,
  type PuppetParameterValues,
  sampleParameterDeformer,
  sampleParameterVertices,
} from '../../deformation'
import type {PuppetDocument, PuppetParameterBinding, PuppetPart} from '../../player'
import {resolveParameterValue} from '../../player/parameter-value'

export interface CreateParameterPreviewOptions {
  readonly editingBindingId?: string
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
}

const sampleParameterPreview = (options: CreateParameterPreviewOptions): PuppetDocument => ({
  ...options.document,
  glue: composeParameterGlue(options),
  motions: [],
  parameterBindings: [],
  parameters: options.document.parameters?.map((parameter) => ({
    ...parameter,
    defaultValue: resolveParameterValue(parameter, options.parameterValues?.[parameter.id]),
  })),
  parts: options.document.parts.map((part) => ({
    ...part,
    mesh: {
      ...part.mesh,
      vertices: composeParameterVertices({
        document: options.document,
        parameterValues: options.parameterValues,
        partId: part.id,
        restVertices: part.mesh.vertices,
      }),
    },
    properties: composeParameterPartProperties({
      document: options.document,
      parameterValues: options.parameterValues,
      partId: part.id,
    }),
  })),
  scene: composeParameterScene(options.document, options.parameterValues),
})

export {createDeformerKeyform, sampleParameterDeformer, sampleParameterVertices}

export const getParameterEditingDocument = (
  document: PuppetDocument,
  bindingId?: string,
): PuppetDocument => {
  if (bindingId === undefined) {
    return document
  }
  return {
    ...document,
    parameterBindings: document.parameterBindings?.map((binding) =>
      binding.id === bindingId ? {...binding, influences: undefined} : binding,
    ),
  }
}

export const createParameterPreview = (options: CreateParameterPreviewOptions): PuppetDocument =>
  sampleParameterPreview({
    ...options,
    document: getParameterEditingDocument(options.document, options.editingBindingId),
  })

interface SamplePartKeyformOptions {
  readonly document: PuppetDocument
  readonly binding: PuppetParameterBinding
  readonly part: PuppetPart
  readonly values: PuppetParameterValues
}

export const samplePartKeyform = (options: SamplePartKeyformOptions) => ({
  glue: options.document.glue
    ?.filter((glue) => glue.first.partId === options.part.id)
    .map((glue) => sampleParameterGlue({...options, glue})),
  partId: options.part.id,
  properties: samplePartProperties(options),
  vertices: sampleParameterVertices({
    ...options,
    partId: options.part.id,
    restVertices: options.part.mesh.vertices,
  }),
})

const samplePartProperties = (options: SamplePartKeyformOptions) => {
  if (
    !options.binding.keyforms.some((keyform) =>
      keyform.parts.some(
        (part) => part.partId === options.part.id && part.properties !== undefined,
      ),
    )
  ) {
    return undefined
  }
  const {multiplyColor, opacity, screenColor} = composeParameterPartProperties({
    document: {
      ...options.document,
      parameterBindings: [{...options.binding, influences: undefined}],
    },
    parameterValues: Object.fromEntries(
      options.binding.parameterIds.map((id, index) => [id, options.values[index]!]),
    ),
    partId: options.part.id,
  })
  return {multiplyColor, opacity, screenColor}
}
