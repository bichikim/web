import {beforeEach, expect, it, vi} from 'vitest'
import {createWorkerFailureHandler} from '..'

const mocks = vi.hoisted(() => ({report: vi.fn()}))
vi.mock('../../client-error-reporter/reporter', () => ({reportClientError: mocks.report}))
beforeEach(() => mocks.report.mockClear())

it('should report the cause before delivering a restart-required response', () => {
  const cause = new Error('worker failed')
  const onResponse = vi.fn(() => {
    expect(mocks.report).toHaveBeenCalledExactlyOnceWith(cause, {feature: 'test', source: 'worker'})
  })
  const handler = createWorkerFailureHandler({
    fallbackDetail: 'fallback',
    feature: 'test',
    onResponse,
  })
  handler({cause, code: 'worker-error', detail: 'detail'})
  expect(onResponse).toHaveBeenCalledExactlyOnceWith({
    message: 'detail',
    restartRequired: true,
    type: 'error',
  })
})

it('should retain feature fallback copy and distinguish unreadable responses', () => {
  const onResponse = vi.fn()
  const handler = createWorkerFailureHandler({
    fallbackDetail: 'fallback',
    feature: 'test',
    onResponse,
  })
  handler({cause: null, code: 'worker-error', detail: ''})
  expect(onResponse).toHaveBeenLastCalledWith({
    message: 'fallback',
    restartRequired: true,
    type: 'error',
  })
  handler({cause: null, code: 'message-error', detail: 'ignored'})
  expect(onResponse).toHaveBeenLastCalledWith({
    message: 'Worker 응답을 읽지 못했습니다.',
    restartRequired: true,
    type: 'error',
  })
})
