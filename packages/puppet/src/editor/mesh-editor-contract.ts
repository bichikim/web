import type {PuppetDocument} from '../player/document'

export interface MeshEditorProps {
  readonly activePartId?: string
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onNotice?: (message: string) => void
}
