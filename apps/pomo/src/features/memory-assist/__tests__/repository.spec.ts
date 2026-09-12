/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {createMemoryMemo} from '../schedule'
import {createMemoryMemoRepository, type MemoryMemoStorage} from '../repository'
import type {MemoryMemo} from '../schema'

it('should persist memo snapshots to web and Toss storage', async () => {
  const writeToss = vi.fn<MemoryMemoStorage['writeToss']>().mockResolvedValue()
  const writeWeb = vi.fn().mockReturnValue(null)
  const repository = createMemoryMemoRepository({
    readToss: vi.fn().mockResolvedValue(null),
    readWeb: vi.fn().mockReturnValue(null),
    usesTossStorage: () => true,
    writeToss,
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
  expect(writeToss).toHaveBeenCalledWith([memo])
})

it('should restore Toss memos and converge the web snapshot', async () => {
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
    readToss: vi.fn().mockResolvedValue([memo]),
    readWeb: vi.fn().mockReturnValue(null),
    usesTossStorage: () => true,
    writeToss: vi.fn<MemoryMemoStorage['writeToss']>().mockResolvedValue(),
    writeWeb,
  })

  await expect(repository.read()).resolves.toEqual([memo])
  expect(writeWeb).toHaveBeenCalledWith([memo])
})

it('should prefer the authoritative Toss snapshot when the bridge is available', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '웹 메모',
  })
  const tossMemo = {...memo, text: '토스 메모'}
  const readToss = vi.fn().mockResolvedValue([tossMemo])
  const writeWeb = vi.fn().mockReturnValue(null)
  const repository = createMemoryMemoRepository({
    readToss,
    readWeb: vi.fn().mockReturnValue([memo]),
    usesTossStorage: () => true,
    writeToss: vi.fn<MemoryMemoStorage['writeToss']>().mockResolvedValue(),
    writeWeb,
  })

  await expect(repository.read()).resolves.toEqual([tossMemo])
  expect(readToss).toHaveBeenCalledOnce()
  expect(writeWeb).toHaveBeenCalledWith([tossMemo])
})

it('should retain a Toss write failure as the persistence error cause', async () => {
  const tossWriteError = new Error('Toss write failed')
  const repository = createMemoryMemoRepository({
    readToss: vi.fn().mockResolvedValue(null),
    readWeb: vi.fn().mockReturnValue(null),
    usesTossStorage: () => true,
    writeToss: vi.fn().mockRejectedValue(tossWriteError),
    writeWeb: vi.fn().mockReturnValue(null),
  })

  await expect(repository.write([])).rejects.toMatchObject({
    cause: tossWriteError,
    message: 'Failed to persist memory memos.',
  })
})

it('should reject a Toss read failure after a failed Toss write', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '저장되지 않은 메모',
  })
  const tossReadError = new Error('Toss read failed')
  let webSnapshot: ReadonlyArray<MemoryMemo> | null = null
  const readWeb = vi.fn(() => webSnapshot)
  const repository = createMemoryMemoRepository({
    readToss: vi.fn().mockRejectedValue(tossReadError),
    readWeb,
    usesTossStorage: () => true,
    writeToss: vi.fn().mockRejectedValue(new Error('Toss write failed')),
    writeWeb: vi.fn((memos) => {
      webSnapshot = memos
      return null
    }),
  })

  await expect(repository.write([memo])).rejects.toThrow('Failed to persist memory memos.')
  expect(webSnapshot).toEqual([memo])
  await expect(repository.read()).rejects.toMatchObject({
    cause: tossReadError,
    message: 'Failed to read memory memos.',
  })
  expect(readWeb).not.toHaveBeenCalled()
})

it('should replace a failed web snapshot when authoritative Toss storage is empty', async () => {
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
    readToss: vi.fn().mockResolvedValue(null),
    readWeb: vi.fn(() => webSnapshot),
    usesTossStorage: () => true,
    writeToss: vi.fn().mockRejectedValue(new Error('Toss write failed')),
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
