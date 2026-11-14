import {stringifyChunked} from '@discoveryjs/json-ext'
import type {PuppetDocument} from './document'
import {getExportDocument} from './get-export-document'

/** Yields the existing formatted JSON as Blob-ready parts without joining the whole document. */
export const serializeDocumentChunks = (
  document: PuppetDocument,
): Generator<string, void, unknown> => stringifyChunked(getExportDocument(document), null, 2)
