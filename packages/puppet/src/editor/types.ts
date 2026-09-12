import type {MeshPoint} from '../mesh'
import type {PuppetDocument} from '../player/document'

export type EditDocumentErrorCode =
  | 'duplicate-vertex'
  | 'edge-blocked'
  | 'edge-exists'
  | 'invalid-edge'
  | 'invalid-mesh'
  | 'invalid-position'
  | 'invalid-vertex'
  | 'inverted-triangle'
  | 'minimum-vertex-count'
  | 'missing-part'
  | 'outside-mesh'
  | 'would-remove-mesh'
export interface EditDocumentFailure {
  readonly error: {readonly code: EditDocumentErrorCode}
  readonly ok: false
}

export interface EditDocumentSuccess {
  readonly document: PuppetDocument
  readonly ok: true
  readonly vertexIndex?: number
}

export type EditDocumentResult = EditDocumentFailure | EditDocumentSuccess

export interface VertexPoint extends MeshPoint {}

export interface MovePartVertexOptions extends VertexPoint {
  readonly document: PuppetDocument
  readonly partId: string
  readonly vertexIndex: number
}

export interface AddPartVertexOptions extends VertexPoint {
  readonly document: PuppetDocument
  readonly partId: string
}

export interface SplitPartTriangleOptions extends AddPartVertexOptions {}

export interface DeletePartVertexOptions {
  readonly document: PuppetDocument
  readonly partId: string
  readonly vertexIndex: number
}

export interface EditPartEdgeOptions {
  readonly document: PuppetDocument
  readonly firstVertexIndex: number
  readonly partId: string
  readonly secondVertexIndex: number
}
