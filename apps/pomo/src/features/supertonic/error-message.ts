import type {SupertonicError} from './errors'

const assertNever = (value: never): never => {
  throw new Error(`처리하지 않은 Supertonic 오류: ${JSON.stringify(value)}`)
}

export const getSupertonicErrorMessage = (error: SupertonicError): string => {
  switch (error.code) {
    case 'backend-failed':
      return `${error.backend.toUpperCase()} 음성 엔진을 준비하지 못했어요.`
    case 'cancelled':
      return 'Supertonic 작업이 취소됐어요.'
    case 'download-failed':
      return `${error.fileName} 다운로드에 실패했어요.${
        error.status === null ? '' : ` (${error.status})`
      }`
    case 'generation-busy':
      return '다른 음성을 만들고 있어요.'
    case 'invalid-model-data':
      return 'Supertonic 모델 데이터 형식이 올바르지 않아요.'
    case 'invalid-model':
      return '지원하지 않는 Supertonic 모델이에요.'
    case 'model-not-ready':
      return 'Supertonic 모델을 먼저 준비해 주세요.'
    case 'worker-failed':
      return 'Supertonic 음성 엔진을 실행하지 못했어요.'
    default:
      return assertNever(error)
  }
}
