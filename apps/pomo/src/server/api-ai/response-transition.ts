import type {ApiAiAttemptState, ApiAiResponse, ApiAiStatus} from './types'

interface ApiAiResponseTransition {
  readonly attemptState: ApiAiAttemptState
  readonly status: ApiAiStatus
  readonly terminal: boolean
  readonly retry: boolean
}

/** Maps provider completion to one job transition, giving requested cancellation precedence. */
export const getApiAiResponseTransition = (
  response: ApiAiResponse,
  cancellation: boolean,
): ApiAiResponseTransition => {
  switch (response.status) {
    case 'queued':
    case 'in_progress':
      return {attemptState: 'running', retry: false, status: 'running', terminal: false}
    case 'completed':
      return {
        attemptState: 'succeeded',
        retry: false,
        status: cancellation ? 'cancelled' : 'succeeded',
        terminal: true,
      }
    case 'failed': {
      const retry = response.fallback && !cancellation
      return {
        attemptState: 'failed',
        retry,
        status: cancellation ? 'cancelled' : retry ? 'queued' : 'failed',
        terminal: !retry,
      }
    }
    case 'cancelled':
      return {attemptState: 'cancelled', retry: false, status: 'cancelled', terminal: true}
    case 'incomplete':
      return {
        attemptState: 'failed',
        retry: false,
        status: cancellation ? 'cancelled' : 'failed',
        terminal: true,
      }
    default: {
      const unhandled: never = response.status
      throw new TypeError(`Unknown AI response status: ${unhandled}`)
    }
  }
}
