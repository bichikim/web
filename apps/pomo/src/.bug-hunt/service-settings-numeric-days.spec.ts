/** @vitest-environment jsdom */
import {beforeEach, expect, it, vi} from 'vitest'

import {createServiceSettingsStorage} from '../features/tools/service-storage'
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

it('should preserve branch, manual mode, and start when days is persisted as a number', async () => {
  const stored = {branch: 'navy', days: 300, manual: true, start: '2026-09-01'}

  fixture.web.set('pomo:service-settings:v1', JSON.stringify(stored))

  await expect(repository.read()).resolves.toEqual({
    branch: 'navy',
    days: '300',
    manual: true,
    start: '2026-09-01',
  })
})
