/** @vitest-environment node */

import {beforeEach, expect, it, vi} from 'vitest'

import {createToolSelectionStorages} from '../features/tools/selection-storage'
import {createStorageFixture} from '../features/tools/__tests__/helpers/storage'

let fixture: ReturnType<typeof createStorageFixture>
let movingSelectionStorage: ReturnType<
  typeof createToolSelectionStorages
>['movingSelectionStorage']

beforeEach(() => {
  fixture = createStorageFixture()
  movingSelectionStorage = createToolSelectionStorages({
    reportRepairError: vi.fn(),
    storage: fixture.adapter,
  }).movingSelectionStorage
})

it('should restore moving selection when month and year are JSON numbers', async () => {
  fixture.web.set('pomo:tool-moving:v1', JSON.stringify({month: 5, year: 2027}))

  await expect(movingSelectionStorage.read()).resolves.toEqual({month: '5', year: '2027'})
})

it('should restore moving selection when month uses a leading zero', async () => {
  fixture.web.set('pomo:tool-moving:v1', JSON.stringify({month: '05', year: '2027'}))

  await expect(movingSelectionStorage.read()).resolves.toEqual({month: '5', year: '2027'})
})
