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
  return hasValidGlue(glue, document.parts) ? {...document, glue} : undefined
}
