/** @vitest-environment node */

import {expect, it, vi} from 'vitest'

import {createMemoryMemo} from '../features/memory-assist/schedule'
import {createMemoryMemoRepository} from '../features/memory-assist/repository'

it('should preserve web memos when native Toss storage is empty on first read', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-web-only',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '브라우저에서 만든 메모',
  })
  const writeWeb = vi.fn().mockReturnValue(null)
  const repository = createMemoryMemoRepository({
    readToss: vi.fn().mockResolvedValue(null),
    readWeb: vi.fn().mockReturnValue([memo]),
    usesTossStorage: () => true,
    writeToss: vi.fn().mockResolvedValue(undefined),
    writeWeb,
  })

  await expect(repository.read()).resolves.toEqual([memo])
  expect(writeWeb).not.toHaveBeenCalledWith([])
})
