/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {createServiceSettingsStorage} from '../features/tools/service-storage'
import {createStorageFixture} from '../features/tools/__tests__/helpers/storage'

let fixture: ReturnType<typeof createStorageFixture>
let repository: ReturnType<typeof createServiceSettingsStorage>

beforeEach(() => {
  fixture = createStorageFixture()
  repository = createServiceSettingsStorage({reportRepairError: vi.fn(), storage: fixture.adapter})
})

it('should keep a native-only legacy enlistment date after the Toss bridge disappears', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.getItem.mockImplementation(async (key) =>
    key === 'pomo:service-start:v1' ? '"2026-09-01"' : null,
  )

  await expect(repository.read()).resolves.toMatchObject({start: '2026-09-01'})

  fixture.usesTossStorage.mockReturnValue(false)

  await expect(repository.read()).resolves.toMatchObject({start: '2026-09-01'})
})
