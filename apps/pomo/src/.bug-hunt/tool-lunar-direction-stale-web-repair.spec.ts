/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {createToolSelectionStorages} from '../features/tools/selection-storage'
import {createStorageFixture} from '../features/tools/__tests__/helpers/storage'

let fixture: ReturnType<typeof createStorageFixture>
let lunarDirectionStorage: ReturnType<
  typeof createToolSelectionStorages
>['lunarDirectionStorage']

beforeEach(() => {
  fixture = createStorageFixture()
  ;({lunarDirectionStorage} = createToolSelectionStorages({
    reportRepairError: vi.fn(),
    storage: fixture.adapter,
  }))
})

it('should keep the native lunar direction after stale web removal fails post-save', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.web.set('pomo:tool-lunar-direction:v1', JSON.stringify('solar'))
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  fixture.removeWeb.mockReturnValue(new Error('blocked'))

  await expect(lunarDirectionStorage.write('lunar')).rejects.toThrow('Failed to discard stale')

  await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
})
