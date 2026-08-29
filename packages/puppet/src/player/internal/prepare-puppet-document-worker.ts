import {parseDocument, type ParseDocumentResult, parseDocumentValue} from '../parse-document'
import type {PreparePuppetDocumentRequest} from './prepare-puppet-document-request'

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
  self.postMessage(prepareDocument(event.data))
})
