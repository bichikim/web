import type {PuppetPart} from '../../player/document'
import type {VertexPoint} from '../edit-document'
import type {MeshEditorProps} from '../mesh-editor-contract'
import {
  getIndexedVertices,
  getMeshViewTriangles,
  type IndexedVertex,
  type MeshTriangle,
} from './mesh-view'
import {getDeformerPreviewDocument, getPartPreviewVertices} from './mesh-preview'
import {applySceneDeformers} from './scene-deformation'

export interface MeshPartView {
  readonly boundaryLoops: ReadonlyArray<ReadonlyArray<IndexedVertex>>
  readonly partId: string
  readonly triangles: ReadonlyArray<MeshTriangle>
  readonly vertices: ReadonlyArray<IndexedVertex>
}

interface CreatePartViewsOptions {
  readonly activePartId?: string
  readonly candidates: ReadonlyArray<PuppetPart>
  readonly draftPoint: VertexPoint | null
  readonly props: MeshEditorProps
  readonly selectedVertex: number | null
}

export const createPartViews = (options: CreatePartViewsOptions): ReadonlyArray<MeshPartView> => {
  const verticesByPartId = new Map(
    options.candidates.map((candidate) => [
      candidate.id,
      new Float32Array(getPartPreviewVertices(options.props, candidate)),
    ]),
  )
  applySceneDeformers({
    document: getDeformerPreviewDocument(options.props),
    verticesByPartId,
  })

  return options.candidates.map((candidate) => {
    const isActivePart = candidate.id === options.activePartId
    const vertices = getIndexedVertices({
      draftPoint: isActivePart ? options.draftPoint : null,
      mesh: {
        ...candidate.mesh,
        vertices: Array.from(verticesByPartId.get(candidate.id) ?? candidate.mesh.vertices),
      },
      selectedVertex: isActivePart ? options.selectedVertex : null,
    })

    return {
      boundaryLoops: (candidate.mesh.boundaryLoops ?? []).map((loop) =>
        loop.flatMap((vertexIndex) => {
          const vertex = vertices[vertexIndex]
          return vertex === undefined ? [] : [vertex]
        }),
      ),
      partId: candidate.id,
      triangles: getMeshViewTriangles({mesh: candidate.mesh, vertices}),
      vertices,
    }
  })
}
