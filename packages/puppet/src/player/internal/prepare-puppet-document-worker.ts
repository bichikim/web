import {parseDocument, type ParseDocumentResult, parseDocumentValue} from '../parse-document'
import type {PreparePuppetDocumentRequest} from './prepare-puppet-document-request'
import {compactDocumentTextures} from '../texture-assets'
import {parseDocumentBlob} from '../parse-document-blob'

const prepareDocument = async (
  request: PreparePuppetDocumentRequest,
): Promise<ParseDocumentResult> => {
  switch (request.type) {
    case 'document':
      return parseDocumentValue(request.document)
    case 'source':
      return parseDocument(request.source)
    case 'blob':
      return parseDocumentBlob({source: request.source})
    default: {
      const exhaustiveRequest: never = request
      return exhaustiveRequest
    }
  }
}

self.addEventListener('message', async (event: MessageEvent<PreparePuppetDocumentRequest>) => {
  try {
    const result = await prepareDocument(event.data)
    self.postMessage(
      result.ok ? {document: compactDocumentTextures(result.document), ok: true} : result,
    )
  } catch (error) {
    self.postMessage({
      error: {message: error instanceof Error ? error.message : String(error)},
      type: 'error',
    })
  }
})
