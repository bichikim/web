/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createServiceSettingsStorage, DEFAULT_SERVICE_SETTINGS} from '../features/tools/service-storage'
import {createStorageFixture} from '../features/tools/__tests__/helpers/storage'

describe('createServiceSettingsStorage legacy enlistment merge', () => {
  let fixture: ReturnType<typeof createStorageFixture>
  let repository: ReturnType<typeof createServiceSettingsStorage>

  beforeEach(() => {
    fixture = createStorageFixture()
    repository = createServiceSettingsStorage({
      reportRepairError: vi.fn(),
      storage: fixture.adapter,
    })
    fixture.usesTossStorage.mockReturnValue(true)
  })

  it('should merge native legacy start when native service-settings has an empty start and web settings are absent', async () => {
    const settings = {...DEFAULT_SERVICE_SETTINGS, branch: 'navy', days: '300', manual: true, start: ''}
    fixture.getItem.mockImplementation(async (key: string) => {
      if (key === 'pomo:service-settings:v1') {
        return JSON.stringify(settings)
      }
      if (key === 'pomo:service-start:v1') {
        return '"2026-09-01"'
      }
      return null
    })

    await expect(repository.read()).resolves.toEqual({...settings, start: '2026-09-01'})
  })

  it('should merge web legacy start when native service-settings has an empty start and web settings are absent', async () => {
    fixture.web.set('pomo:service-start:v1', '"2026-08-15"')
    const settings = {...DEFAULT_SERVICE_SETTINGS, branch: 'air', days: '', manual: false, start: ''}
    fixture.getItem.mockResolvedValue(JSON.stringify(settings))

    await expect(repository.read()).resolves.toEqual({...settings, start: '2026-08-15'})
  })
})
