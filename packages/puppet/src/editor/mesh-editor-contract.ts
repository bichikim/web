import type {PuppetDocument} from '../player/document'

export interface MeshEditorProps {
  readonly activeKeyformValue?: number | null
  readonly activeParameterId?: string
  readonly activePartId?: string
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onNotice?: (message: string) => void
  readonly onVertexEditStart?: () => void
  readonly onVertexSelect?: (vertexIndex: number | null) => void
  readonly previewTime?: number
  readonly parameterValue?: number
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly selectedVertexIndex?: number | null
}
