import {parseDocumentValue} from '../../src/player/parse-document'
import type {ReferenceOptions} from './types'

export type ComparisonSetup = Pick<ReferenceOptions, 'document' | 'frameworkUrl' | 'sdkOrigin'>

/** 개발 서버의 URL 설정에서 비교 문서를 읽는다. 취소 신호는 호출자가 소유한다. */
export const loadSetup = async (signal: AbortSignal): Promise<ComparisonSetup> => {
  const query = new URLSearchParams(location.search)
  const documentUrl = query.get('document')
  const frameworkUrl = query.get('framework')
  if (documentUrl === null || frameworkUrl === null) {
    throw new Error('document와 framework URL이 필요합니다.')
  }
  const response = await fetch(documentUrl, {signal})
  if (!response.ok) {
    throw new Error(`Poffo 문서를 읽지 못했습니다: ${response.status}`)
  }
  const parsed = parseDocumentValue(await response.json())
  if (!parsed.ok) {
    throw new Error('유효한 Poffo 문서가 아닙니다.')
  }
  return {
    document: parsed.document,
    frameworkUrl,
    sdkOrigin: query.get('sdk') ?? 'http://127.0.0.1:5001',
  }
}
