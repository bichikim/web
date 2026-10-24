/** @vitest-environment node */

import {afterEach, expect, it, vi} from 'vitest'

import {createRuntimeOptionResetManager} from '..'
import {DIALOGUE_DRAFT_KEY_PREFIX} from '../../focus-room-dialogue/dialogue-draft'

const createSessionStorage = (entries: Map<string, string>) => ({
  getItem: vi.fn((key: string) => entries.get(key) ?? null),
  key: vi.fn((index: number) => [...entries.keys()][index] ?? null),
  get length() {
    return entries.size
  },
  removeItem: vi.fn((key: string) => entries.delete(key)),
  setItem: vi.fn((key: string, value: string) => entries.set(key, value)),
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should use web storage when no native bridge exists', async () => {
  const removeItem = vi.fn()
  vi.stubGlobal('localStorage', {removeItem})

  await expect(createRuntimeOptionResetManager().reset('updates')).resolves.toEqual({
    status: 'complete',
  })
  expect(removeItem).toHaveBeenCalledWith('pomo:viewed-version-release:v1')
})

it('should collect matching keys before deleting entries that shift storage indices', async () => {
  const firstDraft = `${DIALOGUE_DRAFT_KEY_PREFIX}first`
  const secondDraft = `${DIALOGUE_DRAFT_KEY_PREFIX}second`
  const thirdDraft = `${DIALOGUE_DRAFT_KEY_PREFIX}third`
  const entries = new Map([
    [firstDraft, 'first'],
    ['unrelated', 'preserve'],
    [secondDraft, 'second'],
    [thirdDraft, 'third'],
    ['another', 'preserve'],
  ])
  const storage = createSessionStorage(entries)
  vi.stubGlobal('sessionStorage', storage)
  vi.stubGlobal('localStorage', {removeItem: vi.fn()})

  await expect(createRuntimeOptionResetManager().reset('dialogue')).resolves.toEqual({
    status: 'complete',
  })

  expect(storage.key.mock.calls.map(([index]) => index)).toEqual([0, 1, 2, 3, 4, 0, 1, 2, 3, 4])
  expect(storage.removeItem.mock.calls.map(([key]) => key)).toEqual([
    firstDraft,
    secondDraft,
    thirdDraft,
  ])
  expect(entries).toEqual(
    new Map([
      ['unrelated', 'preserve'],
      ['another', 'preserve'],
    ]),
  )
})

it('should restore collected session entries after a durable reset fails', async () => {
  const firstDraft = `${DIALOGUE_DRAFT_KEY_PREFIX}first`
  const secondDraft = `${DIALOGUE_DRAFT_KEY_PREFIX}second`
  const entries = new Map([
    [firstDraft, ''],
    [secondDraft, 'unsaved'],
    ['unrelated', 'preserve'],
  ])
  const storage = createSessionStorage(entries)
  const failure = new Error('durable removal failed')
  vi.stubGlobal('sessionStorage', storage)
  vi.stubGlobal('localStorage', {
    removeItem: vi.fn(() => {
      throw failure
    }),
  })

  await expect(createRuntimeOptionResetManager().reset('dialogue')).rejects.toMatchObject({
    cause: {cause: failure},
    message: 'Failed to reset Pomo options.',
  })

  expect(storage.setItem.mock.calls).toEqual([
    [firstDraft, ''],
    [secondDraft, 'unsaved'],
  ])
  expect(entries.get(firstDraft)).toBe('')
  expect(entries.get(secondDraft)).toBe('unsaved')
  expect(entries.get('unrelated')).toBe('preserve')
})

it('should leave session and durable storage unchanged when key collection fails', async () => {
  const draftKey = `${DIALOGUE_DRAFT_KEY_PREFIX}first`
  const entries = new Map([[draftKey, 'unsaved']])
  const storage = createSessionStorage(entries)
  const removeDurable = vi.fn()
  const failure = new Error('session key unavailable')
  storage.key.mockImplementation(() => {
    throw failure
  })
  vi.stubGlobal('sessionStorage', storage)
  vi.stubGlobal('localStorage', {removeItem: removeDurable})

  await expect(createRuntimeOptionResetManager().reset('dialogue')).rejects.toMatchObject({
    cause: failure,
    message: 'Failed to reset Pomo options.',
  })

  expect(storage.removeItem).not.toHaveBeenCalled()
  expect(storage.setItem).not.toHaveBeenCalled()
  expect(removeDurable).not.toHaveBeenCalled()
  expect(entries.get(draftKey)).toBe('unsaved')
})
