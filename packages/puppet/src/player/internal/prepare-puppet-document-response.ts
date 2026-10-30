import type {ParseDocumentFailure} from '../parse-document'
import type {compactDocumentTextures} from '../texture-assets'

interface PrepareDocumentWireSuccess {
  readonly document: ReturnType<typeof compactDocumentTextures>
  readonly ok: true
}

interface PrepareDocumentReadFailure {
  readonly type: 'error'
  readonly error: {readonly message: string}
}

export type PreparePuppetDocumentResponse =
  | ParseDocumentFailure
  | PrepareDocumentWireSuccess
  | PrepareDocumentReadFailure
