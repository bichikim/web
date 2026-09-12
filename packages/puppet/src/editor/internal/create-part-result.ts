import {normalizeMesh, validateMesh} from '../../mesh'
import type {PuppetDocument, PuppetMesh, PuppetPart} from '../../player/document'
import type {EditDocumentResult} from '../types'

const replacePart = (document: PuppetDocument, part: PuppetPart): PuppetDocument => ({
  ...document,
  parts: document.parts.map((candidate) => (candidate.id === part.id ? part : candidate)),
})

export const createPartResult = (
  document: PuppetDocument,
  part: PuppetPart,
  mesh: PuppetMesh,
  vertexIndex?: number,
): EditDocumentResult => {
  const normalizedMesh = normalizeMesh(mesh)
  const validation = validateMesh(normalizedMesh)

  return validation.valid
    ? {document: replacePart(document, {...part, mesh: normalizedMesh}), ok: true, vertexIndex}
    : {error: {code: 'invalid-mesh'}, ok: false}
}
