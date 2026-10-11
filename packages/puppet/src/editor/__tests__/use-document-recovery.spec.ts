/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {useDocumentRecovery} from '../use-document-recovery'

test('should load the recovery list and replace the document only after a successful restore', async () => {
  const document = createDemoDocument()
  const entry = {id: 'previous', motionCount: 1, partCount: 3, savedAt: 1000}
  const recovery = {
    listRecoveries: vi.fn().mockResolvedValue([entry]),
    loadRecovery: vi.fn().mockResolvedValue(document),
  }
  const onRestore = vi.fn()
  const onClose = vi.fn()
  const {result} = renderHook(() => useDocumentRecovery({onClose, onRestore, recovery}))
  await waitFor(() => expect(result.loading()).toBe(false))
  expect(result.entries()).toEqual([entry])
  expect(onRestore).not.toHaveBeenCalled()
  await result.restore(entry.id)
  expect(recovery.loadRecovery).toHaveBeenCalledExactlyOnceWith(entry.id)
  expect(onRestore).toHaveBeenCalledExactlyOnceWith(document)
  expect(onClose).toHaveBeenCalledOnce()
})

test('should leave the current document open when a recovery is missing or invalid', async () => {
  const recovery = {
    listRecoveries: vi.fn().mockResolvedValue([]),
    loadRecovery: vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('invalid')),
  }
  const onRestore = vi.fn()
  const onClose = vi.fn()
  const {result} = renderHook(() => useDocumentRecovery({onClose, onRestore, recovery}))
  await result.restore('missing')
  expect(result.error()).toBe('저장된 작업을 찾을 수 없습니다.')
  await result.restore('invalid')
  expect(result.error()).toBe('작업을 복구하지 못했습니다. 다시 시도하세요.')
  expect(result.restoring()).toBe(false)
  expect(onRestore).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})

test('should distinguish unavailable recovery storage from an empty list and allow retry', async () => {
  const recovery = {
    listRecoveries: vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce([]),
    loadRecovery: vi.fn(),
  }
  const {result} = renderHook(() =>
    useDocumentRecovery({onClose: vi.fn(), onRestore: vi.fn(), recovery}),
  )
  await waitFor(() => expect(result.loading()).toBe(false))
  expect(result.error()).toBe('저장된 작업 목록을 불러오지 못했습니다.')
  await result.refresh()
  expect(result.error()).toBeNull()
  expect(result.entries()).toEqual([])
})

test('should not replace the document after the recovery dialog has been closed', async () => {
  const document = createDemoDocument()
  let finish = (_document: typeof document) => {}
  const pending = new Promise<typeof document>((resolve) => {
    finish = resolve
  })
  const recovery = {
    listRecoveries: vi.fn().mockResolvedValue([]),
    loadRecovery: vi.fn().mockReturnValue(pending),
  }
  const onRestore = vi.fn()
  const onClose = vi.fn()
  const {result, cleanup} = renderHook(() => useDocumentRecovery({onClose, onRestore, recovery}))
  const restoring = result.restore('previous')
  expect(result.restoring()).toBe(true)
  cleanup()
  finish(document)
  await restoring
  expect(onRestore).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})
