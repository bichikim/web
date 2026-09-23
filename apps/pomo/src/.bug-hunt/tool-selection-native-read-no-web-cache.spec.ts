/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {createToolSelectionStorages} from '../features/tools/selection-storage'
import {createStorageFixture} from '../features/tools/__tests__/helpers/storage'

let fixture: ReturnType<typeof createStorageFixture>

beforeEach(() => {
  fixture = createStorageFixture()
})

it('should mirror native-only tool selection into web storage for bridge-free reads', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.getItem.mockResolvedValue(JSON.stringify('solar'))

  const {lunarDirectionStorage} = createToolSelectionStorages({
    reportRepairError: vi.fn(),
    storage: fixture.adapter,
  })

  await expect(lunarDirectionStorage.read()).resolves.toBe('solar')

  fixture.usesTossStorage.mockReturnValue(false)

  await expect(lunarDirectionStorage.read()).resolves.toBe('solar')
})
