import type {PuppetParameterValueMap, PuppetParameterValues} from '../deformation'
import type {PuppetDocument} from '../player/document'

export interface MeshEditorProps {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly activePartId?: string
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onNotice?: (message: string) => void
  readonly onVertexEditStart?: () => void
  readonly onVertexSelect?: (vertexIndex: number | null) => void
  readonly previewTime?: number
  readonly parameterValues?: PuppetParameterValues
  readonly parameterValueMap?: PuppetParameterValueMap
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly selectedVertexIndex?: number | null
}
