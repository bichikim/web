import type {PuppetExampleDocument} from './example-document'
import type {DocumentRecovery} from './document-recovery'
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

export interface PuppetEditorProps {
  /** Externally loaded document; omitted, retain the local editor document and history. */
  readonly replacementDocument?: PuppetDocument
  readonly onDocumentCommit?: (document: PuppetDocument) => void
  readonly examples?: ReadonlyArray<PuppetExampleDocument>
  readonly initialDocument?: PuppetDocument
  readonly initialMotionId?: string
  readonly initialWorkspace?: 'animation' | 'modeling'
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly recovery?: DocumentRecovery
}
