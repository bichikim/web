/** @vitest-environment jsdom */
import {afterEach, expect, it} from 'vitest'
import {
  lunarDirectionStorage,
  movingSelectionStorage,
  unitSelectionStorage,
} from '../selection-storage'
afterEach(() => localStorage.clear())
it('should retain all runtime selection APIs', async () => {
  const units = {category: 'area', from: 'pyeong', to: 'm2'} as const
  await unitSelectionStorage.write(units)
  await lunarDirectionStorage.write('lunar')
  await movingSelectionStorage.write({month: '5', year: '2027'})
  await expect(unitSelectionStorage.read()).resolves.toEqual(units)
  await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
  await expect(movingSelectionStorage.read()).resolves.toEqual({month: '5', year: '2027'})
})
