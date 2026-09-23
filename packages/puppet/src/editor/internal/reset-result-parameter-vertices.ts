import type {EditDocumentResult} from '../types'
import {resetParameterPartKeyforms} from './reset-part-deformations'

export const resetResultParameterVertices = (
  result: EditDocumentResult,
  partId: string,
): EditDocumentResult => {
  if (!result.ok) {
    return result
  }

  const part = result.document.parts.find((candidate) => candidate.id === partId)
  return part === undefined
    ? result
    : {
        ...result,
        document: resetParameterPartKeyforms(result.document, partId, part.mesh.vertices),
      }
}
