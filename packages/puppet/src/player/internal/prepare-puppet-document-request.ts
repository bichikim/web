interface PreparePuppetDocumentSourceRequest {
  readonly source: string
  readonly type: 'source'
}

interface PreparePuppetDocumentValueRequest {
  readonly document: unknown
  readonly type: 'document'
}

interface PreparePuppetDocumentBlobRequest {
  readonly source: Blob
  readonly type: 'blob'
}

export type PreparePuppetDocumentRequest =
  | PreparePuppetDocumentSourceRequest
  | PreparePuppetDocumentValueRequest
  | PreparePuppetDocumentBlobRequest
