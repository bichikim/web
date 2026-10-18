/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../player'
import {createRuntimeDocumentSession} from '../create-runtime-document-session'
import {useRuntimeDocument} from '../use-runtime-document'

vi.mock('../create-runtime-document-session', () => ({createRuntimeDocumentSession: vi.fn()}))
const write = vi.fn<ReturnType<typeof createRuntimeDocumentSession>['write']>()
const restored = createEmptyDocument()
const createModelFile = (width: number) => {
  const source = new File([], `${width}.json`)
  Object.defineProperty(source, 'text', {
    value: async () => JSON.stringify({...restored, viewport: {...restored.viewport, width}}),
  })
  return source
}
beforeEach(() => {
  write.mockResolvedValue(undefined)
  vi.mocked(createRuntimeDocumentSession).mockReturnValue({
    listRecoveries: async () => [],
    loadRecovery: async () => null,
    read: async () => restored,
    write,
  })
})
afterEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
})
test('should retain the newest model as the refresh target when older persistence finishes late', async () => {
  let finish: () => void = () => undefined
  write.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const {result} = renderHook(() =>
    useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
  )
  await waitFor(() => expect(result.document()).toBeDefined(), {interval: 1})
  result.loadFile(createModelFile(111))
  await waitFor(() => expect(write).toHaveBeenCalledOnce(), {interval: 1})
  result.loadFile(createModelFile(222))
  await waitFor(() => expect(result.document()?.viewport.width).toBe(222), {interval: 1})
  const latest = sessionStorage.getItem('puppet:runtime-document:v1:default')
  expect(latest).not.toBeNull()
  finish()
  await Promise.resolve()
  await Promise.resolve()
  expect(sessionStorage.getItem('puppet:runtime-document:v1:default')).toBe(latest)
  const refresh = renderHook(() =>
    useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
  )
  await waitFor(() => expect(refresh.result.document()).toBeDefined(), {interval: 1})
  expect(createRuntimeDocumentSession).toHaveBeenLastCalledWith(latest)
})
test('should leave the refresh target unchanged when a page closes during persistence', async () => {
  let finish: () => void = () => undefined
  write.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  sessionStorage.setItem('puppet:runtime-document:v1:default', 'previous')
  const {result, cleanup} = renderHook(() =>
    useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
  )
  await waitFor(() => expect(result.document()).toBeDefined(), {interval: 1})
  result.loadFile(createModelFile(333))
  await waitFor(() => expect(write).toHaveBeenCalledOnce(), {interval: 1})
  cleanup()
  finish()
  await Promise.resolve()
  await Promise.resolve()
  expect(sessionStorage.getItem('puppet:runtime-document:v1:default')).toBe('previous')
})

test('should ignore persistence errors from a superseded model', async () => {
  let fail: (cause: Error) => void = () => undefined
  write.mockImplementationOnce(
    () =>
      new Promise<void>((_resolve, reject) => {
        fail = reject
      }),
  )
  const {result} = renderHook(() =>
    useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
  )
  await waitFor(() => expect(result.document()).toBeDefined(), {interval: 1})
  result.loadFile(createModelFile(111))
  await waitFor(() => expect(write).toHaveBeenCalledOnce(), {interval: 1})
  result.loadFile(createModelFile(222))
  await waitFor(() => expect(result.document()?.viewport.width).toBe(222), {interval: 1})
  fail(new Error('Old write failed'))
  await Promise.resolve()
  await Promise.resolve()
  expect(result.error()).toBeNull()
  expect(result.document()?.viewport.width).toBe(222)
})
test('should retain a loaded model and report its current persistence failure', async () => {
  write.mockRejectedValueOnce(new Error('Write failed'))
  const {result} = renderHook(() =>
    useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
  )
  await waitFor(() => expect(result.document()).toBeDefined(), {interval: 1})
  result.loadFile(createModelFile(333))
  await waitFor(() => expect(result.document()?.viewport.width).toBe(333), {interval: 1})
  expect(result.error()).toBe('모델의 새로고침 복원 정보를 저장하지 못했습니다.')
  expect(sessionStorage.getItem('puppet:runtime-document:v1:default')).toBeNull()
})
