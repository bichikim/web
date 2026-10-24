import type {ParseDocumentFailure} from '../parse-document'
import type {compactDocumentTextures} from '../texture-assets'

interface PrepareDocumentWireSuccess {
  readonly document: ReturnType<typeof compactDocumentTextures>
  readonly ok: true
}

export type PreparePuppetDocumentResponse = ParseDocumentFailure | PrepareDocumentWireSuccess
