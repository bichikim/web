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

it('should restore saved service settings when the enlistment start date has surrounding whitespace', async () => {
  const stored = {branch: 'navy', days: '300', manual: true, start: ' 2026-09-01 '} as const

  fixture.web.set('pomo:service-settings:v1', JSON.stringify(stored))

  await expect(repository.read()).resolves.toEqual({...stored, start: '2026-09-01'})
})

it('should restore a legacy enlistment start date with surrounding whitespace', async () => {
  fixture.web.set('pomo:service-start:v1', '" 2026-09-01 "')

  await expect(repository.read()).resolves.toMatchObject({start: '2026-09-01'})
})
