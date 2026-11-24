import {parseDocument, type ParseDocumentResult, parseDocumentValue} from '../parse-document'
import type {PreparePuppetDocumentRequest} from './prepare-puppet-document-request'
import {compactDocumentTextures} from '../texture-assets'
import {parseDocumentBlob} from '../parse-document-blob'
import {preparedRuntimeSection} from './prepared-document'

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
    if (!result.ok) {
      self.postMessage(result)
      return
    }
    const runtimeSection = preparedRuntimeSection(result.document)
    self.postMessage({
      document: compactDocumentTextures(result.document),
      ok: true,
      ...(runtimeSection === undefined ? {} : {runtimeSection}),
    })
  } catch (error) {
    self.postMessage({
      error: {message: error instanceof Error ? error.message : String(error)},
      type: 'error',
    })
  }
})
