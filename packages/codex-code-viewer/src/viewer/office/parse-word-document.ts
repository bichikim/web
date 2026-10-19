import mammoth from 'mammoth'
import {parseDocumentHtml} from './parse-document-html'
import type {WordResult} from './types'

/** Converts DOCX contents into document nodes with conversion warnings. */
export const parseWordDocument = async (bytes: ArrayBuffer): Promise<WordResult> => {
  try {
    const result = await mammoth.convertToHtml(
      {arrayBuffer: bytes},
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
