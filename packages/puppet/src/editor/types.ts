import type {JSX} from 'solid-js'
import type {ModelBinding} from './model'
import type {EditorController} from './control'
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

export interface EditorHeaderMounts {
  /** Supplies a host toolbar mount for the existing editor brush controls; undefined detaches it. */
  readonly setBrushSettingsMount: (element: HTMLDivElement | undefined) => void
}

export interface PuppetEditorProps {
  /** Host-owned model and undo/redo, fixed for this instance; mount a new editor to bind another session. */
  readonly model: ModelBinding
  /** Initial local animation selection; omitted to use the first motion. */
  readonly initialMotionId?: string
  /** Initial local editing mode; omitted for modeling. */
  readonly initialWorkspace?: 'animation' | 'modeling'
  /** Host header composition; omitted for an editor body without a header. */
  readonly header?: (control: EditorController, mounts: EditorHeaderMounts) => JSX.Element
  /** Reports this instance's control handle once. The handle becomes stale on disposal. */
  readonly onControl?: (control: EditorController) => void
  /** Requested host input activity; deactivation waits for an open transaction to finish. Omitted for active input. */
  readonly active?: boolean
}
