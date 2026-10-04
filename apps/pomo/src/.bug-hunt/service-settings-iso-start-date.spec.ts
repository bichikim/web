/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {createServiceSettingsStorage} from 'src/features/tools/service-storage'
import {createStorageFixture} from 'src/features/tools/__tests__/helpers/storage'

let fixture: ReturnType<typeof createStorageFixture>
let repository: ReturnType<typeof createServiceSettingsStorage>

beforeEach(() => {
  fixture = createStorageFixture()
  repository = createServiceSettingsStorage({
    reportRepairError: vi.fn(),
    storage: fixture.adapter,
  })
})

it('should preserve branch and manual mode when start is an ISO instant with a valid date prefix', async () => {
  const stored = {
    branch: 'navy',
    days: '300',
    manual: true,
    start: '2026-09-01T00:00:00.000Z',
  } as const

  fixture.web.set('pomo:service-settings:v1', JSON.stringify(stored))

  await expect(repository.read()).resolves.toEqual({...stored, start: '2026-09-01'})
})

it('should merge a legacy ISO enlistment date into current settings with an empty start', async () => {
  const settings = {branch: 'air', days: '630', manual: true, start: ''} as const
  const restored = {...settings, start: '2026-09-01'}

  fixture.web.set('pomo:service-settings:v1', JSON.stringify(settings))
  fixture.web.set('pomo:service-start:v1', '"2026-09-01T00:00:00.000Z"')

  await expect(repository.read()).resolves.toEqual(restored)
})
