import {AiJobClientError} from './client'
import type {AiJob, AiJobStatus, AiTextJobInput} from './contracts'

export const ACTIVE_JOB_STATUSES: ReadonlyArray<AiJobStatus> = [
  'queued',
  'running',
  'recovery_pending',
]

export type AiTextJobViewStatus = 'idle' | 'submitting' | AiJobStatus | 'error'

export const isActiveJobStatus = (status: AiTextJobViewStatus): status is AiJobStatus =>
  ACTIVE_JOB_STATUSES.includes(status as AiJobStatus)

export const getClientErrorCode = (error: unknown): string | null =>
  error instanceof AiJobClientError ? error.code : null

export const getSubmissionErrorMessage = (error: unknown): string => {
  switch (getClientErrorCode(error)) {
    case 'unauthorized':
      return '서버 Luna를 사용하려면 Pomo 계정에 로그인해 주세요.'
    case 'not-entitled':
      return '서버 Luna는 Pomo AI 구독자만 사용할 수 있어요. 기기 실행을 선택하거나 구독 상태를 확인해 주세요.'
    case 'quota-exceeded':
      return '이번 구독 기간의 AI 사용 한도에 도달했어요. 한도 숫자는 운영 설정을 확인한 뒤 안내합니다.'
    case 'queue-exceeded':
      return 'AI 요청이 많아 대기열이 가득 찼어요. 잠시 후 다시 시도해 주세요.'
    case 'model-not-supported':
    case 'configuration-error':
      return '현재 서버 Luna를 사용할 수 없어요. 기기 실행을 선택해 주세요.'
    case 'invalid-input':
      return '대화 내용을 확인한 뒤 다시 시도해 주세요.'
    case 'idempotency-conflict':
      return '같은 요청 키에 다른 내용이 연결되어 새 요청으로 다시 시도해야 해요.'
    default:
      return '서버 요청 결과를 확인하지 못했어요. 같은 요청의 상태를 확인해 주세요.'
  }
}

export const getJobFailureMessage = (job: AiJob): string => {
  if (job.error?.message !== null && job.error?.message !== undefined) {
    return job.error.message
  }

  switch (job.status) {
    case 'cancelled':
      return '서버 요청을 취소했어요.'
    case 'timed_out':
      return '서버 요청 시간이 초과됐어요. 다시 시도해 주세요.'
    case 'failed':
      return '서버에서 대화를 만들지 못했어요. 다시 시도해 주세요.'
    default:
      return ''
  }
}

export interface AiTextJobStateForStatus {
  readonly errorMessage: string | null
  readonly job: AiJob | null
  readonly status: AiTextJobViewStatus
}

export const getStatusMessage = (state: AiTextJobStateForStatus): string | null => {
  switch (state.status) {
    case 'idle':
      return null
    case 'submitting':
      return '서버 Luna 요청을 보내는 중이에요.'
    case 'queued':
      return '서버 Luna 대기열에서 준비 중이에요.'
    case 'running':
      return state.job === null || state.job.progress <= 0
        ? '서버 Luna가 대화를 만드는 중이에요.'
        : `서버 Luna가 대화를 만드는 중이에요. ${state.job.progress}%`
    case 'recovery_pending':
      return '요청 수락 여부를 확인 중이에요. 중복 생성은 하지 않습니다.'
    case 'succeeded':
      return 'AI 답변이 준비됐어요.'
    case 'failed':
    case 'cancelled':
    case 'timed_out':
    case 'error':
      return state.errorMessage
    default: {
      const exhaustiveStatus: never = state.status
      return exhaustiveStatus
    }
  }
}

export const isTerminalSubmissionError = (error: unknown): boolean =>
  [
    'configuration-error',
    'idempotency-conflict',
    'invalid-input',
    'model-not-supported',
    'not-entitled',
    'queue-exceeded',
    'quota-exceeded',
    'unauthorized',
  ].includes(getClientErrorCode(error) ?? '')

export const createTextInput = (text: string): AiTextJobInput => ({
  messages: [{content: text, role: 'user'}],
})
