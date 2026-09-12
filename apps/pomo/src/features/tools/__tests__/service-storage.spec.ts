import {beforeEach, expect, it, vi} from 'vitest'
import {createServiceSettingsStorage} from '../service-storage'
import {createStorageFixture} from './helpers/storage'

let fixture: ReturnType<typeof createStorageFixture>
let repository: ReturnType<typeof createServiceSettingsStorage>
beforeEach(() => {
  fixture = createStorageFixture()
  repository = createServiceSettingsStorage({storage: fixture.adapter})
})
it('should restore custom duration and mode along with the date and branch', async () => {
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  await repository.write(settings)
  await expect(repository.read()).resolves.toEqual(settings)
  await repository.write({...settings, manual: false})
  await expect(repository.read()).resolves.toEqual({...settings, manual: false})
})
it('should preserve the previously saved enlistment date and reject malformed data', async () => {
  fixture.web.set('pomo:service-start:v1', '"2026-09-01"')
  await expect(repository.read()).resolves.toMatchObject({manual: false, start: '2026-09-01'})
  fixture.web.set('pomo:service-start:v1', '"2026-02-30"')
  fixture.web.set('pomo:service-settings:v1', '{"manual":"true"}')
  await expect(repository.read()).resolves.toMatchObject({manual: false, start: ''})
})
it('should use native storage and wait for saves before restoring', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  let finish: (() => void) | undefined
  const values = new Map([['pomo:service-start:v1', '"2026-08-01"']])
  fixture.getItem.mockImplementation((key: string) => Promise.resolve(values.get(key) ?? null))
  fixture.setItem.mockImplementation(
    (key: string, value: string) =>
      new Promise<void>((resolve) => {
        finish = () => {
          values.set(key, value)
          resolve()
        }
      }),
  )
  await expect(repository.read()).resolves.toMatchObject({start: '2026-08-01'})
  const settings = {branch: 'army', days: '300', manual: true, start: '2026-09-09'} as const
  const saving = repository.write(settings)
  await vi.waitFor(() => expect(fixture.setItem).toHaveBeenCalled())
  const reading = repository.read()
  finish?.()
  await saving
  await expect(reading).resolves.toEqual(settings)
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
it.each(['pomo:service-settings:v1', 'pomo:service-start:v1'])(
  'should return a save made during the native read of %s',
  async (key) => {
    fixture.usesTossStorage.mockReturnValue(true)
    const delayed = Promise.withResolvers<string | null>()
    fixture.getItem.mockImplementation((requested: string) =>
      requested === key ? delayed.promise : Promise.resolve(null),
    )
    const reading = repository.read()
    await vi.waitFor(() => expect(fixture.getItem).toHaveBeenCalledWith(key))
    const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
    await repository.write(settings)
    delayed.resolve(null)
    await expect(reading).resolves.toEqual(settings)
  },
)
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
it('should retry a stale native read when browser storage is unavailable', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  const delayed = Promise.withResolvers<string | null>()
  fixture.getItem.mockReturnValueOnce(delayed.promise).mockResolvedValue(JSON.stringify(settings))
  const reading = repository.read()
  await vi.waitFor(() => expect(fixture.getItem).toHaveBeenCalled())
  await repository.write(settings)
  delayed.resolve(null)
  await expect(reading).resolves.toEqual(settings)
})
it('should preserve native read errors when there is no web copy', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.getItem.mockRejectedValue(new Error('read failed'))
  await expect(repository.read()).rejects.toThrow('read failed')
})
it('should return a concurrent save even when the old native read rejects', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const delayed = Promise.withResolvers<string | null>()
  fixture.getItem.mockReturnValueOnce(delayed.promise)
  const reading = repository.read()
  await vi.waitFor(() => expect(fixture.getItem).toHaveBeenCalled())
  const settings = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  await repository.write(settings)
  delayed.reject(new Error('read failed'))
  await expect(reading).resolves.toEqual(settings)
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
it('should wait for native persistence before restoring after web replacement fails', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const previous = {branch: 'navy', days: '200', manual: true, start: '2026-09-01'} as const
  const next = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  fixture.web.set('pomo:service-settings:v1', JSON.stringify(previous))
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  const delayed = Promise.withResolvers<void>()
  fixture.setItem.mockReturnValue(delayed.promise)
  fixture.getItem.mockResolvedValue(JSON.stringify(next))
  const saving = repository.write(next)
  const reading = repository.read()
  delayed.resolve()
  await saving
  await expect(reading).resolves.toEqual(next)
})
it('should retain a newer web save after an older native write completes', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const previous = {branch: 'navy', days: '200', manual: true, start: '2026-09-01'} as const
  const next = {branch: 'navy', days: '300', manual: true, start: '2026-09-01'} as const
  fixture.writeWeb.mockReturnValueOnce(new Error('blocked'))
  const delayed = Promise.withResolvers<void>()
  fixture.setItem.mockReturnValueOnce(delayed.promise).mockResolvedValue(undefined)
  const first = repository.write(previous)
  await vi.waitFor(() => expect(fixture.setItem).toHaveBeenCalled())
  const second = repository.write(next)
  delayed.resolve()
  await Promise.all([first, second])
  expect(fixture.web.get('pomo:service-settings:v1')).toBe(JSON.stringify(next))
  await expect(repository.read()).resolves.toEqual(next)
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
  const independent = createServiceSettingsStorage({storage: other.adapter})
  try {
    await expect(independent.read()).resolves.toMatchObject({start: ''})
  } finally {
    delayed.resolve()
    await saving
  }
})
