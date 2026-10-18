import mammoth from 'mammoth'
import {failure, type Result, success} from '../shared/contracts'
import {parseDocumentHtml} from '../viewer/office/parse-document-html'
import {parseSpreadsheet} from '../viewer/office/parse-spreadsheet'
import type {SpreadsheetResult, WordResult} from '../viewer/office/types'
import {readMediaBytes} from './read-media-bytes'
import {readMediaInfo} from './read-media-info'

const MAX_OFFICE_BYTES = 16777216
interface OfficeRequest {
  readonly root: string
  readonly path: string
  readonly revision: string
}
interface WordPreview {
  readonly kind: 'word'
  readonly document: WordResult
}
interface SpreadsheetPreview {
  readonly kind: 'spreadsheet'
  readonly document: SpreadsheetResult
}
type OfficePreview = WordPreview | SpreadsheetPreview

const wordDocument = async (buffer: Buffer): Promise<WordResult> => {
  try {
    const result = await mammoth.convertToHtml(
      {buffer},
      {externalFileAccess: false, includeEmbeddedStyleMap: false},
    )
    return {
      nodes: parseDocumentHtml(result.value),
      ok: true,
      warnings: result.messages.map((message) => message.message),
    }
  } catch {
    return {
      message: 'DOCX 파일을 읽을 수 없습니다. 손상되었거나 암호화된 파일인지 확인해 주세요.',
      ok: false,
    }
  }
}
/** Reads a revision-checked local Office file through the existing document parsers. */
export const previewOfficeDocument = async (
  request: OfficeRequest,
): Promise<Result<OfficePreview>> => {
  const info = readMediaInfo(request.root, request.path)
  if (!info.ok) {
    return info
  }
  if (info.value.revision !== request.revision) {
    return failure('stale-document')
  }
  const {kind, size} = info.value.media
  if (kind !== 'word' && kind !== 'spreadsheet') {
    return failure('unsupported-file')
  }
  if (size > MAX_OFFICE_BYTES) {
    return failure('media-too-large')
  }
  const bytes = readMediaBytes({...request, size})
  if (!bytes.ok) {
    return bytes
  }
  return kind === 'word'
    ? success({document: await wordDocument(bytes.value), kind})
    : success({document: parseSpreadsheet(Uint8Array.from(bytes.value).buffer), kind})
}
