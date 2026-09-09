/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {readServiceSettings, writeServiceSettings} from '../service-storage'

const {getItem, setItem} = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: {getItem, setItem}}))
afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
it('should restore custom duration and mode along with the date and branch', async () => {
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  await writeServiceSettings(settings)
  await expect(readServiceSettings()).resolves.toEqual(settings)
  await writeServiceSettings({...settings, manual: false})
  await expect(readServiceSettings()).resolves.toEqual({...settings, manual: false})
})
it('should preserve the previously saved enlistment date and reject malformed data', async () => {
  localStorage.setItem('pomo:service-start:v1', '"2026-09-01"')
  await expect(readServiceSettings()).resolves.toMatchObject({manual: false, start: '2026-09-01'})
  localStorage.setItem('pomo:service-start:v1', '"2026-02-30"')
  localStorage.setItem('pomo:service-settings:v1', '{"manual":"true"}')
  await expect(readServiceSettings()).resolves.toMatchObject({manual: false, start: ''})
})
it('should use native storage and wait for saves before restoring', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  let finish: (() => void) | undefined
  const values = new Map([['pomo:service-start:v1', '"2026-08-01"']])
  getItem.mockImplementation((key: string) => Promise.resolve(values.get(key) ?? null))
  setItem.mockImplementation(
    (key: string, value: string) =>
      new Promise<void>((resolve) => {
        finish = () => {
          values.set(key, value)
          resolve()
        }
      }),
  )
  await expect(readServiceSettings()).resolves.toMatchObject({start: '2026-08-01'})
  const settings = {branch: 'army', days: '300', manual: true, start: '2026-09-09'} as const
  const saving = writeServiceSettings(settings)
  await vi.waitFor(() => expect(setItem).toHaveBeenCalled())
  const reading = readServiceSettings()
  finish?.()
  await saving
  await expect(reading).resolves.toEqual(settings)
})
