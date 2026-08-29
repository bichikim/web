interface PreparePuppetDocumentSourceRequest {
  readonly source: string
  readonly type: 'source'
}

interface PreparePuppetDocumentValueRequest {
  readonly document: unknown
  readonly type: 'document'
}

export type PreparePuppetDocumentRequest =
  | PreparePuppetDocumentSourceRequest
  | PreparePuppetDocumentValueRequest
