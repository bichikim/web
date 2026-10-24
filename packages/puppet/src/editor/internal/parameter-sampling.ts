import {composeParameterGlue, sampleParameterGlue} from '../../deformation/parameter-glue'
import {
  composeParameterGroupDrawOrder,
  composeParameterGroupProperties,
  composeParameterPartDrawOrder,
  composeParameterPartProperties,
  composeParameterScene,
  composeParameterVertices,
  createDeformerKeyform,
  type PuppetParameterValueMap,
  type PuppetParameterValues,
  sampleParameterDeformer,
  sampleParameterVertices,
} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetPart,
  PuppetSceneNode,
} from '../../player'
import {resolveParameterValue} from '../../player/parameter-value'

export interface CreateParameterPreviewOptions {
  readonly editingBindingId?: string
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
}

/** 바인딩을 제거하기 전에 그룹의 키폼 색상·불투명도·그리기 순서를 장면에 반영한다. */
const samplePreviewNodes = (
  options: CreateParameterPreviewOptions,
  nodes: ReadonlyArray<PuppetSceneNode>,
): ReadonlyArray<PuppetSceneNode> =>
  nodes.map((node) => {
    if (node.kind === 'part') {
      return node
    }
    const children = samplePreviewNodes(options, node.children)
    if (node.kind !== 'group') {
      return {...node, children}
    }
    const drawOrderGroup =
      node.properties?.drawOrder !== undefined || node.properties?.offscreen === true
    const {multiplyColor, opacity, screenColor} = composeParameterGroupProperties({
      document: options.document,
      group: node,
      parameterValues: options.parameterValues,
    })
    return {
      ...node,
      children,
      properties: {
        ...node.properties,
        multiplyColor,
        opacity,
        screenColor,
        ...(drawOrderGroup
          ? {
              drawOrder: composeParameterGroupDrawOrder(
                options.document,
                node,
                options.parameterValues,
              ),
            }
          : {}),
      },
    }
  })

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
    properties: {
      ...composeParameterPartProperties({
        document: options.document,
        parameterValues: options.parameterValues,
        partId: part.id,
      }),
      drawOrder: composeParameterPartDrawOrder(options.document, part.id, options.parameterValues),
    },
  })),
  scene: {
    roots: samplePreviewNodes(
      options,
      composeParameterScene(options.document, options.parameterValues).roots,
    ),
  },
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
    ?.filter(
      (glue) =>
        glue.first.partId === options.part.id &&
        !(
          options.binding.targetGlueIds?.includes(glue.id) === true ||
          options.binding.keyforms.some((form) =>
            form.glue?.some((sample) => sample.id === glue.id),
          )
        ),
    )
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
  const document = {
    ...options.document,
    parameterBindings: [{...options.binding, influences: undefined}],
  }
  const parameterValues = Object.fromEntries(
    options.binding.parameterIds.map((id, index) => [id, options.values[index]!]),
  )
  const {multiplyColor, opacity, screenColor} = composeParameterPartProperties({
    document,
    parameterValues,
    partId: options.part.id,
  })
  const keyedDrawOrder = options.binding.keyforms.some((keyform) =>
    keyform.parts.some(
      (part) => part.partId === options.part.id && part.properties?.drawOrder !== undefined,
    ),
  )
  return keyedDrawOrder
    ? {
        drawOrder: composeParameterPartDrawOrder(document, options.part.id, parameterValues),
        multiplyColor,
        opacity,
        screenColor,
      }
    : {multiplyColor, opacity, screenColor}
}
