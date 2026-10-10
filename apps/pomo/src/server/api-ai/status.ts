import type {ApiAiAttemptState, ApiAiStatus} from './types'

export const isApiAiJobActive = (status: ApiAiStatus): boolean => {
  switch (status) {
    case 'submitting':
    case 'running':
    case 'recovery_pending':
      return true
    case 'queued':
    case 'succeeded':
    case 'failed':
    case 'cancelled':
      return false
    default: {
      const unhandled: never = status
      throw new TypeError(`Unknown AI job status: ${unhandled}`)
    }
  }
}

export const isApiAiAttemptActive = (state: ApiAiAttemptState): boolean => {
  switch (state) {
    case 'submitting':
    case 'running':
    case 'unknown':
      return true
    case 'succeeded':
    case 'rejected':
    case 'failed':
    case 'cancelled':
      return false
    default: {
      const unhandled: never = state
      throw new TypeError(`Unknown AI attempt state: ${unhandled}`)
    }
  }
}
