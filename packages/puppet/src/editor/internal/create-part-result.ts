import {normalizeMesh, validateMesh} from '../../mesh'
import type {PuppetDocument, PuppetMesh, PuppetPart} from '../../player/document'
import type {EditDocumentResult} from '../types'
import {reconcileSpatialSurface} from './reconcile-spatial-surface'

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
  const nextCount = normalizedMesh.vertices.length
  const previousCount = part.mesh.vertices.length

  return validation.valid
    ? {
        document: replacePart(document, {
          ...part,
          mesh: normalizedMesh,
          spatial: reconcileSpatialSurface({
            addedVertexIndex: nextCount > previousCount ? vertexIndex : undefined,
            document,
            mesh: normalizedMesh,
            part,
            removedVertexIndex: nextCount < previousCount ? vertexIndex : undefined,
          }),
        }),
        ok: true,
        vertexIndex: nextCount > previousCount ? vertexIndex : undefined,
      }
    : {error: {code: 'invalid-mesh'}, ok: false}
}
