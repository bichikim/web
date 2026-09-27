import {beforeEach, expect, it, vi} from 'vitest'

import {createStorageFixture} from '../features/tools/__tests__/helpers/storage'
import {
  createServiceSettingsStorage,
  DEFAULT_SERVICE_SETTINGS,
} from '../features/tools/service-storage'

let fixture: ReturnType<typeof createStorageFixture>
let repository: ReturnType<typeof createServiceSettingsStorage>

beforeEach(() => {
  fixture = createStorageFixture()
  fixture.usesTossStorage.mockReturnValue(true)
  repository = createServiceSettingsStorage({
    reportRepairError: vi.fn(),
    storage: fixture.adapter,
  })
})

it('should keep the native enlistment date when web service settings still have an empty start', async () => {
  const webSettings = {
    ...DEFAULT_SERVICE_SETTINGS,
    branch: 'navy',
    days: '300',
    manual: true,
    start: '',
  }
  const nativeSettings = {...webSettings, start: '2026-09-01'}
  fixture.web.set('pomo:service-settings:v1', JSON.stringify(webSettings))
  fixture.getItem.mockResolvedValue(JSON.stringify(nativeSettings))

  await expect(repository.read()).resolves.toEqual(nativeSettings)
})
