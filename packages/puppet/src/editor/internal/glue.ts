import {
  isTwoDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValues,
} from '../../deformation'
import type {PuppetParameterKeyform} from '../../player/document'
import type {PuppetDocument, PuppetGlue, PuppetVertexReference} from '../../player'
import {hasValidGlue, isBoundaryReference} from '../../player/internal/parse-glue'
import {isSceneNodeLocked} from './scene-graph'

export const canGlueVertex = (document: PuppetDocument, vertex: PuppetVertexReference): boolean =>
  isBoundaryReference(vertex, document.parts) &&
  !isSceneNodeLocked(document, vertex.partId) &&
  !(document.glue ?? []).some((glue) =>
    [glue.first, glue.second].some(
      (reference) =>
        reference.partId === vertex.partId &&
        (reference.vertexIndex === vertex.vertexIndex ||
          (reference === glue.second &&
            'edge' in glue.second &&
            glue.second.edge.endIndex === vertex.vertexIndex)),
    ),
  )

export const addGlue = (
  document: PuppetDocument,
  first: PuppetVertexReference,
  second: PuppetVertexReference,
): PuppetDocument | undefined => {
  if (
    !canGlueVertex(document, first) ||
    !canGlueVertex(document, second) ||
    first.partId === second.partId
  ) {
    return undefined
  }
  let suffix = 1
  const ids = new Set(document.glue?.map((glue) => glue.id))
  while (ids.has(`glue-${suffix}`)) {
    suffix += 1
  }
  return {
    ...document,
    glue: [
      ...(document.glue ?? []),
      {first: first, id: `glue-${suffix}`, second: second, strength: 1, weight: 0.5},
    ],
  }
}

export const updateGlue = (
  document: PuppetDocument,
  id: string,
  changes: Pick<PuppetGlue, 'weight' | 'strength'> | null,
): PuppetDocument | undefined => {
  const connection = document.glue?.find((glue) => glue.id === id)
  if (
    connection === undefined ||
    [connection.first, connection.second].some((vertex) =>
      isSceneNodeLocked(document, vertex.partId),
    )
  ) {
    return undefined
  }
  const glue =
    changes === null
      ? document.glue?.filter((glue) => glue.id !== id)
      : document.glue?.map((glue) => (glue.id === id ? {...glue, ...changes} : glue))
  if (!hasValidGlue(glue, document.parts)) {
    return undefined
  }
  return changes === null ? reconcileGlueKeyforms({...document, glue}) : {...document, glue}
}

interface SetGlueKeyformOptions {
  readonly document: PuppetDocument
  readonly bindingId: string
  readonly values: PuppetParameterValues
  readonly glueId: string
  readonly changes: Pick<PuppetGlue, 'weight' | 'strength'>
}

export const setGlueKeyform = (options: SetGlueKeyformOptions): PuppetDocument | undefined => {
  const glue = options.document.glue?.find((glue) => glue.id === options.glueId)
  const binding = options.document.parameterBindings?.find(
    (binding) => binding.id === options.bindingId,
  )
  const form = binding?.keyforms.find((form) => parameterValuesEqual(form.values, options.values))
  if (
    glue === undefined ||
    binding === undefined ||
    form === undefined ||
    !form.parts.some((part) => part.partId === glue.first.partId) ||
    updateGlue(options.document, glue.id, options.changes) === undefined
  ) {
    return undefined
  }
  const replace = <Form extends PuppetParameterKeyform>(candidate: Form): Form =>
    candidate === form
      ? {
          ...candidate,
          parts: candidate.parts.map((part) =>
            part.partId === glue.first.partId
              ? {
                  ...part,
                  glue: [
                    ...(part.glue ?? []).filter((value) => value.id !== glue.id),
                    {id: glue.id, ...options.changes},
                  ],
                }
              : part,
          ),
        }
      : candidate
  const next = isTwoDimensionalParameterBinding(binding)
    ? {...binding, keyforms: binding.keyforms.map(replace)}
    : {...binding, keyforms: binding.keyforms.map(replace)}
  return {
    ...options.document,
    parameterBindings: options.document.parameterBindings?.map((candidate) =>
      candidate === binding ? next : candidate,
    ),
  }
}

/** Removes keyform samples whose connection no longer exists. */
export const reconcileGlueKeyforms = (document: PuppetDocument): PuppetDocument => {
  const replace = <Form extends PuppetParameterKeyform>(form: Form): Form => ({
    ...form,
    parts: form.parts.map((part) =>
      part.glue === undefined
        ? part
        : {
            ...part,
            glue: part.glue.filter((sample) =>
              document.glue?.some(
                (glue) => glue.id === sample.id && glue.first.partId === part.partId,
              ),
            ),
          },
    ),
  })
  return {
    ...document,
    parameterBindings: document.parameterBindings?.map((binding) =>
      isTwoDimensionalParameterBinding(binding)
        ? {...binding, keyforms: binding.keyforms.map(replace)}
        : {...binding, keyforms: binding.keyforms.map(replace)},
    ),
  }
}
