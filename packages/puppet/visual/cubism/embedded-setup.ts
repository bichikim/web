import {parseDocumentValue} from '../../src/player/parse-document'
import {embedded} from './embedded-data'
import type {ComparisonSetup} from './load-setup'

/** 포함된 Poffo 문서만 읽는다. 네트워크 주소는 사용하지 않는다. */
export const loadSetup = async (signal: AbortSignal): Promise<ComparisonSetup> => {
  signal.throwIfAborted()
  const parsed = parseDocumentValue(JSON.parse(embedded().document))
  if (!parsed.ok) {
    throw new Error('유효한 Poffo 문서가 아닙니다.')
  }
  return {document: parsed.document, frameworkUrl: '', sdkOrigin: ''}
}
