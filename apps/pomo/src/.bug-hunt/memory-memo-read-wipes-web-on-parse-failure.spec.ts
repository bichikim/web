/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {createMemoryMemoRepository} from '../features/memory-assist'

it('should not persist an empty web snapshot when native and web memo reads both fail to parse', async () => {
  const writeWeb = vi.fn().mockReturnValue(null)
  const repository = createMemoryMemoRepository({
    readToss: vi.fn().mockResolvedValue(null),
    readWeb: vi.fn().mockReturnValue(null),
    usesTossStorage: () => true,
    writeToss: vi.fn().mockResolvedValue(),
    writeWeb,
  })

  await expect(repository.read()).resolves.toEqual([])
  expect(writeWeb).not.toHaveBeenCalled()
})
