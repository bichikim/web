/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {importPoffoAsset} from '../import-poffo-asset'
import {usePoffoImport} from '../use-poffo-import'

vi.mock('../import-poffo-asset', () => ({importPoffoAsset: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

const file = new File(['document'], 'character.json')
const asset = (id: string) => ({id, name: `${id}.json`})

test('should select and store each sequential import including the same file again', async () => {
  const select = vi.fn()
  const {result} = renderHook(() => usePoffoImport(select))
  vi.mocked(importPoffoAsset)
    .mockResolvedValueOnce(asset('first'))
    .mockResolvedValueOnce(asset('second'))
  await result.importFiles([file])
  await result.importFiles([file])
  expect(select.mock.calls).toEqual([['first'], ['second']])
  expect(vi.mocked(importPoffoAsset).mock.calls).toEqual([[file], [file]])
})

test('should ignore empty input without superseding a pending import', async () => {
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof importPoffoAsset>>>()
  vi.mocked(importPoffoAsset).mockReturnValue(pending.promise)
  const select = vi.fn()
  const {result} = renderHook(() => usePoffoImport(select))
  const importing = result.importFiles([file])
  await result.importFiles([])
  pending.resolve(asset('first'))
  await importing
  expect(select).toHaveBeenCalledExactlyOnceWith('first')
})

test('should retain the latest import when both saves finish in reverse order', async () => {
  const earlier = Promise.withResolvers<Awaited<ReturnType<typeof importPoffoAsset>>>()
  vi.mocked(importPoffoAsset)
    .mockReturnValueOnce(earlier.promise)
    .mockResolvedValueOnce(asset('latest'))
  const select = vi.fn()
  const {result} = renderHook(() => usePoffoImport(select))
  const importing = result.importFiles([file])
  await result.importFiles([file])
  earlier.resolve(asset('earlier'))
  await importing
  expect(select.mock.calls).toEqual([['latest']])
  expect(importPoffoAsset).toHaveBeenCalledTimes(2)
})

test('should leave selection unchanged if the latest import fails before the earlier one completes', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const earlier = Promise.withResolvers<Awaited<ReturnType<typeof importPoffoAsset>>>()
  vi.mocked(importPoffoAsset)
    .mockReturnValueOnce(earlier.promise)
    .mockRejectedValueOnce(new Error('invalid'))
  const select = vi.fn()
  const {result} = renderHook(() => usePoffoImport(select))
  const importing = result.importFiles([file])
  await result.importFiles([file])
  earlier.resolve(asset('earlier'))
  await importing
  expect(select).not.toHaveBeenCalled()
  expect(result.error()).toBe('Poffo 파일을 가져오지 못했어요.')
})

test('should retain a manual selection when an earlier import completes', async () => {
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof importPoffoAsset>>>()
  vi.mocked(importPoffoAsset).mockReturnValue(pending.promise)
  const select = vi.fn()
  const {result} = renderHook(() => usePoffoImport(select))
  const importing = result.importFiles([file])
  result.selectAsset('manual')
  pending.resolve(asset('earlier'))
  await importing
  expect(select.mock.calls).toEqual([['manual']])
})

test('should not show a stale failure after a newer import succeeds', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const earlier = Promise.withResolvers<Awaited<ReturnType<typeof importPoffoAsset>>>()
  vi.mocked(importPoffoAsset)
    .mockReturnValueOnce(earlier.promise)
    .mockResolvedValueOnce(asset('latest'))
  const select = vi.fn()
  const {result} = renderHook(() => usePoffoImport(select))
  const importing = result.importFiles([file])
  await result.importFiles([file])
  earlier.reject(new Error('old failure'))
  await importing
  expect(result.error()).toBeNull()
  expect(select.mock.calls).toEqual([['latest']])
})

test('should report a current failure and clear it on the next import', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(importPoffoAsset)
    .mockRejectedValueOnce(new Error('invalid'))
    .mockResolvedValueOnce(asset('retry'))
  const select = vi.fn()
  const {result} = renderHook(() => usePoffoImport(select))
  await result.importFiles([file])
  expect(result.error()).toBe('Poffo 파일을 가져오지 못했어요.')
  await result.importFiles([file])
  expect(result.error()).toBeNull()
  expect(select).toHaveBeenCalledExactlyOnceWith('retry')
})

test('should finish storage without selecting after settings are disposed', async () => {
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof importPoffoAsset>>>()
  vi.mocked(importPoffoAsset).mockReturnValue(pending.promise)
  const select = vi.fn()
  const {result, cleanup: dispose} = renderHook(() => usePoffoImport(select))
  const importing = result.importFiles([file])
  dispose()
  pending.resolve(asset('stored'))
  await importing
  expect(select).not.toHaveBeenCalled()
})
