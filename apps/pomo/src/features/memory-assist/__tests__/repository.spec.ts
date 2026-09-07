import {expect, it, vi} from 'vitest'

import {createMemoryMemo} from '../schedule'
import {createMemoryMemoRepository} from '../repository'
import type {MemoryMemo} from '../schema'

it('should persist memo snapshots to web and native storage', async () => {
  const writeNative = vi.fn().mockResolvedValue(null)
  const writeWeb = vi.fn().mockReturnValue(null)
  const repository = createMemoryMemoRepository({
    hasNative: () => true,
    readNative: vi.fn().mockResolvedValue(null),
    readWeb: vi.fn().mockReturnValue(null),
    writeNative,
    writeWeb,
  })
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '새 메모',
  })

  await repository.write([memo])

  expect(writeWeb).toHaveBeenCalledWith([memo])
  expect(writeNative).toHaveBeenCalledWith([memo])
})

it('should restore native memos and converge the web snapshot', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '복원할 메모',
  })
  const writeWeb = vi.fn().mockReturnValue(null)
  const repository = createMemoryMemoRepository({
    hasNative: () => true,
    readNative: vi.fn().mockResolvedValue([memo]),
    readWeb: vi.fn().mockReturnValue(null),
    writeNative: vi.fn().mockResolvedValue(null),
    writeWeb,
  })

  await expect(repository.read()).resolves.toEqual([memo])
  expect(writeWeb).toHaveBeenCalledWith([memo])
})

it('should prefer the authoritative native snapshot when the bridge is available', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '웹 메모',
  })
  const nativeMemo = {...memo, text: '네이티브 메모'}
  const readNative = vi.fn().mockResolvedValue([nativeMemo])
  const writeWeb = vi.fn().mockReturnValue(null)
  const repository = createMemoryMemoRepository({
    hasNative: () => true,
    readNative,
    readWeb: vi.fn().mockReturnValue([memo]),
    writeNative: vi.fn().mockResolvedValue(null),
    writeWeb,
  })

  await expect(repository.read()).resolves.toEqual([nativeMemo])
  expect(readNative).toHaveBeenCalledOnce()
  expect(writeWeb).toHaveBeenCalledWith([nativeMemo])
})

it('should not hide a native write failure behind a successful web cache write', async () => {
  const repository = createMemoryMemoRepository({
    hasNative: () => true,
    readNative: vi.fn().mockResolvedValue(null),
    readWeb: vi.fn().mockReturnValue(null),
    writeNative: vi.fn().mockResolvedValue(new Error('native failed')),
    writeWeb: vi.fn().mockReturnValue(null),
  })

  await expect(repository.write([])).rejects.toThrow('Failed to persist memory memos.')
})

it('should reject a native read failure after a failed native write', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '저장되지 않은 메모',
  })
  const nativeReadError = new Error('native read failed')
  let webSnapshot: ReadonlyArray<MemoryMemo> | null = null
  const readWeb = vi.fn(() => webSnapshot)
  const repository = createMemoryMemoRepository({
    hasNative: () => true,
    readNative: vi.fn().mockRejectedValue(nativeReadError),
    readWeb,
    writeNative: vi.fn().mockResolvedValue(new Error('native write failed')),
    writeWeb: vi.fn((memos) => {
      webSnapshot = memos
      return null
    }),
  })

  await expect(repository.write([memo])).rejects.toThrow('Failed to persist memory memos.')
  expect(webSnapshot).toEqual([memo])
  await expect(repository.read()).rejects.toMatchObject({
    cause: nativeReadError,
    message: 'Failed to read memory memos.',
  })
  expect(readWeb).not.toHaveBeenCalled()
})

it('should replace a failed web snapshot when authoritative native storage is empty', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '저장되지 않은 메모',
  })
  let webSnapshot: ReadonlyArray<MemoryMemo> | null = null
  const repository = createMemoryMemoRepository({
    hasNative: () => true,
    readNative: vi.fn().mockResolvedValue(null),
    readWeb: vi.fn(() => webSnapshot),
    writeNative: vi.fn().mockResolvedValue(new Error('native write failed')),
    writeWeb: vi.fn((memos) => {
      webSnapshot = memos
      return null
    }),
  })

  await expect(repository.write([memo])).rejects.toThrow('Failed to persist memory memos.')
  expect(webSnapshot).toEqual([memo])
  await expect(repository.read()).resolves.toEqual([])
  expect(webSnapshot).toEqual([])
})
