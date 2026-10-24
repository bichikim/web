import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import type {SupertonicError} from './errors'

const assertNever = (value: never): never => {
  throw new Error(`처리하지 않은 Supertonic 오류: ${JSON.stringify(value)}`)
}

export const getSupertonicErrorMessage = (error: SupertonicError): string => {
  switch (error.code) {
    case 'backend-failed':
      return m.supertonic_backend_failed({backend: error.backend.toUpperCase()})
    case 'cancelled':
      return m.supertonic_cancelled()
    case 'download-failed': {
      const status = error.status === null ? '' : ` (${error.status})`
      return m.supertonic_download_failed({
        fileName: getLocale() === 'en' ? 'voice model file' : error.fileName,
        status,
      })
    }
    case 'generation-busy':
      return m.supertonic_generation_busy()
    case 'invalid-model-data':
      return m.supertonic_invalid_model_data()
    case 'invalid-model':
      return m.supertonic_invalid_model()
    case 'model-not-ready':
      return m.supertonic_model_not_ready()
    case 'worker-failed':
      return m.supertonic_worker_failed()
    default:
      return assertNever(error)
  }
}
