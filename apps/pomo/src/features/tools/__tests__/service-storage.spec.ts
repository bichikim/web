import {beforeEach, expect, it, vi} from 'vitest'
import {createServiceSettingsStorage} from '../service-storage'
import {createStorageFixture} from './helpers/storage'

let reportRepairError: ReturnType<typeof vi.fn<(error: unknown) => void>>
let fixture: ReturnType<typeof createStorageFixture>
let repository: ReturnType<typeof createServiceSettingsStorage>
beforeEach(() => {
  reportRepairError = vi.fn()
  fixture = createStorageFixture()
  repository = createServiceSettingsStorage({reportRepairError, storage: fixture.adapter})
})
it('should restore custom duration and mode along with the date and branch', async () => {
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  await repository.write(settings)
  await expect(repository.read()).resolves.toEqual(settings)
  await repository.write({...settings, manual: false})
  await expect(repository.read()).resolves.toEqual({...settings, manual: false})
})
it.each(['not-a-number', '0', '-1', '1.5', '9007199254740992'])(
  'should clear invalid saved service duration %s while preserving the other settings',
  async (days) => {
    const settings = {branch: 'army', days, manual: true, start: '2026-09-01'} as const
    fixture.web.set('pomo:service-settings:v1', JSON.stringify(settings))
    await expect(repository.read()).resolves.toEqual({...settings, days: ''})
  },
)
it('should preserve the previously saved enlistment date and reject malformed data', async () => {
  fixture.web.set('pomo:service-start:v1', '"2026-09-01"')
  await expect(repository.read()).resolves.toMatchObject({manual: false, start: '2026-09-01'})
  fixture.web.set('pomo:service-start:v1', '"2026-02-30"')
  fixture.web.set('pomo:service-settings:v1', '{"manual":"true"}')
  await expect(repository.read()).resolves.toMatchObject({manual: false, start: ''})
})
it.each([
  null,
  '{invalid',
  '{"manual":true}',
  JSON.stringify({branch: 'army', days: '', manual: false, start: ''}),
])('should prefer valid web settings over native %s', async (stored) => {
  fixture.usesTossStorage.mockReturnValue(true)
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  fixture.web.set('pomo:service-settings:v1', JSON.stringify(settings))
  fixture.getItem.mockResolvedValue(stored)
  await expect(repository.read()).resolves.toEqual(settings)
})
it('should restore the web copy after a native save fails', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  fixture.setItem.mockRejectedValue(new Error('native unavailable'))
  await expect(repository.write(settings)).rejects.toThrow('native unavailable')
  fixture.getItem.mockResolvedValue(null)
  await expect(repository.read()).resolves.toEqual(settings)
})
it('should restore the legacy web date when native values are missing', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.getItem.mockResolvedValue(null)
  fixture.web.set('pomo:service-start:v1', '"2026-09-01"')
  await expect(repository.read()).resolves.toMatchObject({start: '2026-09-01'})
})
it('should restore current native settings before a legacy web date', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.web.set('pomo:service-settings:v1', '{invalid')
  fixture.web.set('pomo:service-start:v1', '"2026-08-01"')
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  fixture.getItem.mockResolvedValue(JSON.stringify(settings))
  await expect(repository.read()).resolves.toEqual(settings)
})
it('should preserve native read errors when there is no web copy', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.getItem.mockRejectedValue(new Error('read failed'))
  await expect(repository.read()).rejects.toThrow('read failed')
})
it('should restore the native save when replacing an existing web copy fails', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  fixture.web.set('pomo:service-settings:v1', JSON.stringify({...settings, days: '200'}))
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  fixture.getItem.mockResolvedValue(JSON.stringify(settings))
  await repository.write(settings)
  await expect(repository.read()).resolves.toEqual(settings)
})

it('should preserve the existing web copy when both writes fail', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const previous = {branch: 'navy', days: '200', manual: true, start: '2026-09-01'} as const
  const next = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  fixture.web.set('pomo:service-settings:v1', JSON.stringify(previous))
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  fixture.setItem.mockRejectedValue(new Error('native failed'))
  await expect(repository.write(next)).rejects.toThrow('native failed')
  await expect(repository.read()).resolves.toEqual(previous)
})
it('should report an error if a readable stale web copy cannot be removed', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const previous = {branch: 'navy', days: '200', manual: true, start: '2026-09-01'} as const
  const next = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  fixture.web.set('pomo:service-settings:v1', JSON.stringify(previous))
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  fixture.removeWeb.mockReturnValue(new Error('blocked'))
  await expect(repository.write(next)).rejects.toThrow('Failed to discard stale')
})

it('should isolate pending writes and revisions between repositories', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const delayed = Promise.withResolvers<void>()
  fixture.setItem.mockReturnValue(delayed.promise)
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  const saving = repository.write(settings)
  const other = createStorageFixture()
  other.usesTossStorage.mockReturnValue(true)
  const independent = createServiceSettingsStorage({
    reportRepairError: vi.fn(),
    storage: other.adapter,
  })
  try {
    await expect(independent.read()).resolves.toMatchObject({start: ''})
  } finally {
    delayed.resolve()
    await saving
  }
})

it.each([null, JSON.stringify({branch: 'army', days: '', manual: false, start: ''} as const)])(
  'should repair native %s before web data is cleared',
  async (stored) => {
    fixture.usesTossStorage.mockReturnValue(true)
    const latest = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
    fixture.web.set('pomo:service-settings:v1', JSON.stringify(latest))
    let nativeValue = stored
    fixture.getItem.mockImplementation(async () => nativeValue)
    fixture.setItem.mockImplementation(async (_key, value) => {
      nativeValue = value
    })
    await expect(repository.read()).resolves.toEqual(latest)
    fixture.web.clear()
    await expect(repository.read()).resolves.toEqual(latest)
  },
)
it('should retry a failed repair on the next read while preserving the web value', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const latest = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  const error = new Error('repair failed')
  fixture.web.set('pomo:service-settings:v1', JSON.stringify(latest))
  fixture.setItem.mockRejectedValueOnce(error)
  await expect(repository.read()).resolves.toEqual(latest)
  await expect(repository.read()).resolves.toEqual(latest)
  fixture.web.clear()
  await expect(repository.read()).resolves.toEqual(latest)
  expect(reportRepairError).toHaveBeenCalledExactlyOnceWith(error)
})
it('should avoid native repair on the regular web', async () => {
  const latest = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  fixture.web.set('pomo:service-settings:v1', JSON.stringify(latest))
  await expect(repository.read()).resolves.toEqual(latest)
  expect(fixture.setItem).not.toHaveBeenCalled()
})
