/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'

vi.mock('../../api-json', () => ({apiJsonRequest: vi.fn(), parseJsonResponse: vi.fn()}))
vi.mock('../../user-auth/app-session', () => ({readStoredAppSession: vi.fn()}))

import {AiJobClientError} from '../client'
import {getSubmissionErrorMessage, isTerminalSubmissionError} from '../status'

const TERMINAL_ERRORS = [
  {
    code: 'unauthorized',
    message: '서버 Luna를 사용하려면 Pomo 계정에 로그인해 주세요.',
  },
  {
    code: 'not-entitled',
    message:
      '서버 Luna는 Pomo AI 구독자만 사용할 수 있어요. 기기 실행을 선택하거나 구독 상태를 확인해 주세요.',
  },
  {
    code: 'quota-exceeded',
    message:
      '이번 구독 기간의 AI 사용 한도에 도달했어요. 한도 숫자는 운영 설정을 확인한 뒤 안내합니다.',
  },
  {
    code: 'queue-exceeded',
    message: 'AI 요청이 많아 대기열이 가득 찼어요. 잠시 후 다시 시도해 주세요.',
  },
  {
    code: 'model-not-supported',
    message: '현재 서버 Luna를 사용할 수 없어요. 기기 실행을 선택해 주세요.',
  },
  {
    code: 'configuration-error',
    message: '현재 서버 Luna를 사용할 수 없어요. 기기 실행을 선택해 주세요.',
  },
  {
    code: 'invalid-input',
    message: '대화 내용을 확인한 뒤 다시 시도해 주세요.',
  },
  {
    code: 'idempotency-conflict',
    message: '같은 요청 키에 다른 내용이 연결되어 새 요청으로 다시 시도해야 해요.',
  },
] as const

const UNKNOWN_CODES = [
  '',
  'unauthorized ',
  'Unauthorized',
  'unknown',
  'toString',
  'constructor',
  '__proto__',
  'hasOwnProperty',
  'get',
  'ai_feature_unreleased',
  'http_503',
  'ai_artifact_not_available',
] as const
const NON_CLIENT_ERRORS = [
  {name: 'ordinary Error', value: new Error('unauthorized')},
  {name: 'structurally coded object', value: {code: 'unauthorized'}},
  {name: 'null', value: null},
  {name: 'undefined', value: undefined},
  {name: 'string', value: 'unauthorized'},
  {name: 'number', value: 503},
] as const
const RECOVERY_MESSAGE = '서버 요청 결과를 확인하지 못했어요. 같은 요청의 상태를 확인해 주세요.'

const createError = (code: string) => new AiJobClientError({code, status: 503})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('getSubmissionErrorMessage', () => {
  it.each(TERMINAL_ERRORS)('should preserve the message for $code', ({code, message}) => {
    expect(getSubmissionErrorMessage(createError(code))).toBe(message)
  })

  it.each(UNKNOWN_CODES)('should keep the recovery message for unknown code %j', (code) => {
    expect(getSubmissionErrorMessage(createError(code))).toBe(RECOVERY_MESSAGE)
  })

  it.each(NON_CLIENT_ERRORS)('should keep the recovery message for $name', ({value}) => {
    expect(getSubmissionErrorMessage(value)).toBe(RECOVERY_MESSAGE)
  })
})

describe('isTerminalSubmissionError', () => {
  it.each(TERMINAL_ERRORS)('should classify $code as terminal', ({code}) => {
    expect(isTerminalSubmissionError(createError(code))).toBe(true)
  })

  it.each(UNKNOWN_CODES)('should leave unknown code %j recoverable', (code) => {
    expect(isTerminalSubmissionError(createError(code))).toBe(false)
  })

  it.each(NON_CLIENT_ERRORS)('should leave $name recoverable', ({value}) => {
    expect(isTerminalSubmissionError(value)).toBe(false)
  })
})

describe('submission error decisions', () => {
  const decisions = [
    {expected: TERMINAL_ERRORS[0].message, name: 'message', run: getSubmissionErrorMessage},
    {expected: true, name: 'terminal classification', run: isTerminalSubmissionError},
  ] as const

  it.each(decisions)('should read the error code once for $name', ({expected, run}) => {
    const error = createError('unauthorized')
    const readCode = vi.fn(() => 'unauthorized')
    Object.defineProperty(error, 'code', {get: readCode})

    expect(run(error)).toBe(expected)
    expect(readCode).toHaveBeenCalledOnce()
  })

  it.each(decisions)('should preserve a code getter failure for $name', ({run}) => {
    const error = createError('unauthorized')
    const failure = Symbol('code unavailable')
    Object.defineProperty(error, 'code', {
      get() {
        throw failure
      },
    })
    let observed: unknown
    try {
      run(error)
    } catch (cause) {
      observed = cause
    }
    expect(observed).toBe(failure)
  })

  it('should read a fresh code for each independently requested decision', () => {
    const error = createError('unauthorized')
    const readCode = vi.fn().mockReturnValueOnce('unauthorized').mockReturnValueOnce('http_503')
    Object.defineProperty(error, 'code', {get: readCode})

    expect(getSubmissionErrorMessage(error)).toBe(TERMINAL_ERRORS[0].message)
    expect(isTerminalSubmissionError(error)).toBe(false)
    expect(readCode).toHaveBeenCalledTimes(2)
  })
})
