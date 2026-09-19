/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {EntryPlaybackController} from '../features/focus-room-dialogue/entry-playback-controller'
import type {
  EventDialogueIds,
  EventPlaybackModes,
} from '../features/focus-room-dialogue/event-context'
import type {PDialogueRepository} from '../features/focus-room-dialogue/repository'
import {FOCUS_ROOM_ENTRY_EVENT} from '../features/focus-room-dialogue/schema'
import {
  createEntryEventPlayback,
  type EntryPlaybackSessionStorage,
} from '../features/focus-room-dialogue/use-p-event-controller/entry-playback'

const ENTRY_DIALOGUE_IDS: EventDialogueIds = {[FOCUS_ROOM_ENTRY_EVENT]: ['missing-dialogue']}
const ENTRY_PLAYBACK_MODES: EventPlaybackModes = {[FOCUS_ROOM_ENTRY_EVENT]: 'sequential-all'}
const ENTRY_PLAYBACK_SESSION_KEY = 'pomo:focus-room-entry-playback:v1'

const createStorage = (): EntryPlaybackSessionStorage => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

const createRepository = (): PDialogueRepository => ({}) as PDialogueRepository

describe('entry playback missing dialogue session bug', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  // createEntryPlaybackController resolves missing dialogue/audio as 'ended'
  // (see entry-playback-controller-playback.spec.ts).
  it('should allow retry after unavailable entry dialogue resolves as ended', async () => {
    const storage = createStorage()
    const playSequence = vi
      .fn<EntryPlaybackController['playSequence']>()
      .mockResolvedValueOnce('ended')
      .mockResolvedValueOnce('ended')
    const playback = {playSequence} as unknown as EntryPlaybackController
    const entryPlayback = createEntryEventPlayback({
      eventDialogueIds: () => ENTRY_DIALOGUE_IDS,
      eventPlaybackModes: () => ENTRY_PLAYBACK_MODES,
      getRepository: () => createRepository(),
      isPlaybackEnabled: () => true,
      playback,
      sessionStorage: storage,
    })

    entryPlayback.enterFocusRoom()
    await Promise.resolve()

    expect(playSequence).toHaveBeenCalledOnce()
    expect(storage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBeNull()

    entryPlayback.tryPlay()

    expect(playSequence).toHaveBeenCalledTimes(2)
    expect(storage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBeNull()
  })
})
