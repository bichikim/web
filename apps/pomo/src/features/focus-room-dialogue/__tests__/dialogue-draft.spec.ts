/** @vitest-environment jsdom */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  deleteDialogueDraft,
  type DialogueDraftStorage,
  getDialogueDraftKey,
  readDialogueDraft,
  writeDialogueDraft,
} from '../dialogue-draft'

afterEach(() => {
  vi.restoreAllMocks()
})

const createStorage = (): DialogueDraftStorage => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe('dialogue draft storage', () => {
  it('should derive keys for new and existing dialogues', () => {
    expect(getDialogueDraftKey(null)).toBe('pomo:focus-room-dialogue:draft:new')
    expect(getDialogueDraftKey('dialogue-id')).toBe('pomo:focus-room-dialogue:draft:dialogue-id')
  })

  it('should tolerate unavailable session storage operations', () => {
    const cause = new Error('storage unavailable')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw cause
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw cause
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw cause
    })

    expect(readDialogueDraft('draft')).toBeNull()
    expect(() => writeDialogueDraft('draft', 'text')).not.toThrow()
    expect(() => deleteDialogueDraft('draft')).not.toThrow()
    expect(warning).toHaveBeenNthCalledWith(1, 'Failed to read focus room dialogue draft.', cause)
    expect(warning).toHaveBeenNthCalledWith(2, 'Failed to save focus room dialogue draft.', cause)
    expect(warning).toHaveBeenNthCalledWith(3, 'Failed to delete focus room dialogue draft.', cause)
  })

  it('should persist through an injected session store', () => {
    const storage = createStorage()

    writeDialogueDraft('draft', 'text', storage)

    expect(readDialogueDraft('draft', storage)).toBe('text')
    deleteDialogueDraft('draft', storage)
    expect(readDialogueDraft('draft', storage)).toBeNull()
  })
})
