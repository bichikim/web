/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {
  lunarDirectionStorage,
  movingSelectionStorage,
  unitSelectionStorage,
} from '../selection-storage'
const {getItem, setItem} = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: {getItem, setItem}}))
afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
it('should restore each tool selection independently', async () => {
  const units = {category: 'area', from: 'pyeong', to: 'm2'} as const
  await unitSelectionStorage.write(units)
  await lunarDirectionStorage.write('lunar')
  await movingSelectionStorage.write({month: '5', year: '2027'})
  await expect(unitSelectionStorage.read()).resolves.toEqual(units)
  await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
  await expect(movingSelectionStorage.read()).resolves.toEqual({month: '5', year: '2027'})
})
it('should reject mismatched units, unknown directions and unsupported months', async () => {
  localStorage.setItem(
    'pomo:tool-units:v1',
    JSON.stringify({category: 'length', from: 'kg', to: 'm'}),
  )
  localStorage.setItem('pomo:tool-lunar-direction:v1', '"unknown"')
  localStorage.setItem('pomo:tool-moving:v1', JSON.stringify({month: '13', year: '2051'}))
  await expect(unitSelectionStorage.read()).resolves.toBeNull()
  await expect(lunarDirectionStorage.read()).resolves.toBeNull()
  await expect(movingSelectionStorage.read()).resolves.toBeNull()
})
it('should use native storage and restore after a pending native save', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  let complete: (() => void) | undefined
  let stored = '"solar"'
  getItem.mockImplementation(() => Promise.resolve(stored))
  setItem.mockImplementation(
    (_key: string, value: string) =>
      new Promise<void>((resolve) => {
        complete = () => {
          stored = value
          resolve()
        }
      }),
  )
  const saving = lunarDirectionStorage.write('lunar')
  await vi.waitFor(() => expect(setItem).toHaveBeenCalled())
  const restoring = lunarDirectionStorage.read()
  complete?.()
  await saving
  await expect(restoring).resolves.toBe('lunar')
})
