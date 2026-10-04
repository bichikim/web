/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseStorageJson} from 'src/utils/runtime-storage/parse-storage-json'
import {createServiceSettingsStorage} from 'src/features/tools/service-storage'
import {createStorageFixture} from 'src/features/tools/__tests__/helpers/storage'

it('should parse JSON storage values prefixed with a UTF-8 BOM', () => {
  const stored = {branch: 'army', days: '300', manual: true, start: '2026-09-01'}

  expect(parseStorageJson(`\ufeff${JSON.stringify(stored)}`, (value) => value)).toEqual(stored)
})

it('should restore service settings when the web storage JSON includes a UTF-8 BOM', async () => {
  const fixture = createStorageFixture()
  const repository = createServiceSettingsStorage({reportRepairError: () => undefined, storage: fixture.adapter})
  const stored = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const

  fixture.web.set('pomo:service-settings:v1', `\ufeff${JSON.stringify(stored)}`)

  await expect(repository.read()).resolves.toEqual(stored)
})
