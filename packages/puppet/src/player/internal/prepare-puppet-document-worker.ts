import {parseDocument, type ParseDocumentResult, parseDocumentValue} from '../parse-document'
import type {PreparePuppetDocumentRequest} from './prepare-puppet-document-request'
import {compactDocumentTextures} from '../texture-assets'

const prepareDocument = (request: PreparePuppetDocumentRequest): ParseDocumentResult => {
  switch (request.type) {
    case 'document':
      return parseDocumentValue(request.document)
    case 'source':
      return parseDocument(request.source)
    default: {
      const exhaustiveRequest: never = request
      return exhaustiveRequest
    }
  }
}

self.addEventListener('message', (event: MessageEvent<PreparePuppetDocumentRequest>) => {
  const result = prepareDocument(event.data)
  self.postMessage(
    result.ok ? {document: compactDocumentTextures(result.document), ok: true} : result,
  )
})
