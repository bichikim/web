/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('../../focus-room-dialogue', () => ({DIALOGUE_DRAFT_KEY_PREFIX: 'draft:'}))
vi.mock('../../focus-room-entry-history', () => ({settleEntryHistoryWrites: vi.fn()}))
vi.mock('../../focus-room-dialogue/use-p-event-controller/entry-playback', () => ({
  clearEntryEventPlaybackSession: vi.fn(),
}))

import {createOptionResetManager, type OptionResetResult, type OptionResetStorage} from '..'

const DESKTOP_KEYS = [
  'pomo:desktop-mode:v1',
  'pomo:desktop-clean-exit:v1',
  'pomo:desktop-mode-owner:v1',
] as const

afterEach(() => vi.restoreAllMocks())

const createStorage = () => ({
  getSessionStorageEntriesByPrefix: vi.fn<OptionResetStorage['getSessionStorageEntriesByPrefix']>(
    () => [],
  ),
  getToss: vi.fn<OptionResetStorage['getToss']>(async () => null),
  removeSessionStorageByPrefix: vi.fn<OptionResetStorage['removeSessionStorageByPrefix']>(),
  removeToss: vi.fn<OptionResetStorage['removeToss']>(async () => undefined),
  removeWeb: vi.fn<OptionResetStorage['removeWeb']>(),
  setSessionStorageItem: vi.fn<OptionResetStorage['setSessionStorageItem']>(),
  setToss: vi.fn<OptionResetStorage['setToss']>(async () => undefined),
  setWeb: vi.fn<OptionResetStorage['setWeb']>(),
  usesTossStorage: vi.fn(() => true),
})

const createManager = (storage: OptionResetStorage) =>
  createOptionResetManager({
    resetEntrySession: vi.fn(),
    resetLocale: vi.fn(async () => undefined),
    storage,
  })

const createRecovery = (unreadKey?: string) => {
  const storage = createStorage()
  const nativeValues = new Map<string, string>(DESKTOP_KEYS.map((key) => [key, `${key}:native`]))
  const webValues = new Map<string, string>(DESKTOP_KEYS.map((key) => [key, `${key}:web`]))
  const reads = new Map<string, number>()
  const trace: string[] = []
  storage.getToss.mockImplementation(async (key) => {
    trace.push(`read:${key}`)
    const count = (reads.get(key) ?? 0) + 1
    reads.set(key, count)
    if (key === unreadKey && count > 1) {
      throw new Error('Verification unavailable')
    }
    return nativeValues.get(key) ?? null
  })
  storage.removeToss.mockImplementation(async (key) => {
    trace.push(`delete:${key}`)
    if (key === DESKTOP_KEYS[1]) {
      throw new Error('Deletion unavailable')
    }
    nativeValues.delete(key)
  })
  storage.setToss.mockImplementation(async (key) => {
    trace.push(`restore:${key}`)
    throw new Error('Restoration unavailable')
  })
  storage.removeWeb.mockImplementation((key) => {
    trace.push(`web:remove:${key}`)
    webValues.delete(key)
  })
  storage.setWeb.mockImplementation((key, value) => {
    trace.push(`web:set:${key}`)
    webValues.set(key, value)
  })
  return {storage, trace, webValues}
}

it('should count preserved, removed and unreadable recovery values in storage order', async () => {
  const {storage, trace, webValues} = createRecovery(DESKTOP_KEYS[2])

  await expect(createManager(storage).reset('desktop')).resolves.toEqual({
    preservedCount: 1,
    resetCount: 1,
    status: 'partial',
    unresolvedCount: 1,
  })

  expect(trace).toEqual([
    ...DESKTOP_KEYS.map((key) => `read:${key}`),
    `delete:${DESKTOP_KEYS[0]}`,
    `delete:${DESKTOP_KEYS[1]}`,
    `restore:${DESKTOP_KEYS[1]}`,
    `restore:${DESKTOP_KEYS[0]}`,
    ...DESKTOP_KEYS.map((key) => `read:${key}`),
    `web:remove:${DESKTOP_KEYS[0]}`,
    `web:set:${DESKTOP_KEYS[1]}`,
  ])
  expect(webValues.has(DESKTOP_KEYS[0])).toBe(false)
  expect(webValues.get(DESKTOP_KEYS[1])).toBe(`${DESKTOP_KEYS[1]}:native`)
  expect(webValues.get(DESKTOP_KEYS[2])).toBe(`${DESKTOP_KEYS[2]}:web`)
})

it('should count a failed mirror write and continue preserving later values', async () => {
  const {storage, trace, webValues} = createRecovery()
  storage.setWeb.mockImplementation((key, value) => {
    trace.push(`web:set:${key}`)
    if (key === DESKTOP_KEYS[1]) {
      throw new Error('Mirror unavailable')
    }
    webValues.set(key, value)
  })

  await expect(createManager(storage).reset('desktop')).resolves.toEqual({
    preservedCount: 1,
    resetCount: 1,
    status: 'partial',
    unresolvedCount: 1,
  })

  expect(trace.slice(-3)).toEqual([
    `web:remove:${DESKTOP_KEYS[0]}`,
    `web:set:${DESKTOP_KEYS[1]}`,
    `web:set:${DESKTOP_KEYS[2]}`,
  ])
  expect(webValues.get(DESKTOP_KEYS[1])).toBe(`${DESKTOP_KEYS[1]}:web`)
  expect(webValues.get(DESKTOP_KEYS[2])).toBe(`${DESKTOP_KEYS[2]}:native`)
})

it('should count only successful mirror removals and continue after a removal failure', async () => {
  const storage = createStorage()
  storage.removeWeb.mockImplementation((key) => {
    if (key === DESKTOP_KEYS[1]) {
      throw new Error('Mirror unavailable')
    }
  })

  await expect(createManager(storage).reset('desktop')).resolves.toEqual({
    preservedCount: 0,
    resetCount: 2,
    status: 'partial',
    unresolvedCount: 1,
  })
  expect(storage.removeWeb.mock.calls).toEqual(DESKTOP_KEYS.map((key) => [key]))
  expect(storage.setWeb).not.toHaveBeenCalled()
})

it('should retain the shared complete result across independently reset groups', async () => {
  const first = await createManager(createStorage()).reset('desktop')
  const second = await createManager(createStorage()).reset('updates')

  expect(first).toEqual({status: 'complete'})
  expect(second).toBe(first)
})

it('should keep counts independent when a mirror callback starts another reset', async () => {
  const storage = createStorage()
  const manager = createManager(storage)
  let nested: Promise<OptionResetResult> | undefined
  storage.removeWeb.mockImplementation((key) => {
    if (key === DESKTOP_KEYS[0]) {
      nested = manager.reset('updates')
    }
    if (key === DESKTOP_KEYS[1]) {
      throw new Error('Mirror unavailable')
    }
  })

  await expect(manager.reset('desktop')).resolves.toEqual({
    preservedCount: 0,
    resetCount: 2,
    status: 'partial',
    unresolvedCount: 1,
  })
  expect(nested).toBeDefined()
  await expect(nested).resolves.toEqual({status: 'complete'})
})
