import type {PuppetDocument} from './document'
import {getExportDocument} from './get-export-document'

export const serializeDocument = (document: PuppetDocument) =>
  JSON.stringify(getExportDocument(document), null, 2)
