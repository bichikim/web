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

it('should keep service settings readable from web after the native bridge is gone', async () => {
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.getItem.mockResolvedValue(JSON.stringify(settings))

  await expect(repository.read()).resolves.toEqual(settings)

  fixture.usesTossStorage.mockReturnValue(false)

  await expect(repository.read()).resolves.toEqual(settings)
})
