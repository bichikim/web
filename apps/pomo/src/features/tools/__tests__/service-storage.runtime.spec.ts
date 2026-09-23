/** @vitest-environment jsdom */
import {afterEach, expect, it} from 'vitest'
import {readServiceSettings, writeServiceSettings} from '../service-storage'
afterEach(() => localStorage.clear())
it('should retain the runtime service settings API', async () => {
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  await writeServiceSettings(settings)
  await expect(readServiceSettings()).resolves.toEqual(settings)
  expect(JSON.parse(localStorage.getItem('pomo:service-settings:v1') ?? 'null')).toEqual(settings)
})
