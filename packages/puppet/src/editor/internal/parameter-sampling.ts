import {
  composeParameterPartProperties,
  composeParameterScene,
  composeParameterVertices,
  createDeformerKeyform,
  type PuppetParameterValueMap,
  sampleParameterDeformer,
  sampleParameterVertices,
} from '../../deformation'
import type {PuppetDocument} from '../../player'

export interface CreateParameterPreviewOptions {
  readonly editingBindingId?: string
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
}

const sampleParameterPreview = (options: CreateParameterPreviewOptions): PuppetDocument => ({
  ...options.document,
  motions: [],
  parameterBindings: [],
  parameters: [],
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
