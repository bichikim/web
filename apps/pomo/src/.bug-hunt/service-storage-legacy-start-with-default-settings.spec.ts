/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {
  createServiceSettingsStorage,
  DEFAULT_SERVICE_SETTINGS,
} from '../features/tools/service-storage'
import {createStorageFixture} from '../features/tools/__tests__/helpers/storage'

let fixture: ReturnType<typeof createStorageFixture>
let repository: ReturnType<typeof createServiceSettingsStorage>

beforeEach(() => {
  fixture = createStorageFixture()
  repository = createServiceSettingsStorage({
    reportRepairError: vi.fn(),
    storage: fixture.adapter,
  })
})

it('should merge legacy enlistment date when saved settings still have an empty start', async () => {
  fixture.web.set('pomo:service-start:v1', '"2026-09-01"')
  fixture.web.set('pomo:service-settings:v1', JSON.stringify(DEFAULT_SERVICE_SETTINGS))

  await expect(repository.read()).resolves.toMatchObject({start: '2026-09-01'})
})
