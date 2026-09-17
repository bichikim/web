/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {EntryPlaybackController} from '../../entry-playback-controller'
import type {EventDialogueIds, EventPlaybackModes} from '../../event-context'
import type {PDialogueRepository} from '../../repository'
import {createEntryEventPlayback} from '../entry-playback'

const ENTRY_DIALOGUE_IDS: EventDialogueIds = {'room-enter': ['dialogue']}
const ENTRY_PLAYBACK_MODES: EventPlaybackModes = {'room-enter': 'sequential-all'}
const ENTRY_PLAYBACK_SESSION_KEY = 'pomo:focus-room-entry-playback:v1'

const createPlayback = () => {
  const playSequence = vi.fn<EntryPlaybackController['playSequence']>()

  return {
    playback: {playSequence} as unknown as EntryPlaybackController,
    playSequence,
  }
}

const createEntryPlayback = (playback: EntryPlaybackController) =>
  createEntryEventPlayback({
    eventDialogueIds: () => ENTRY_DIALOGUE_IDS,
    eventPlaybackModes: () => ENTRY_PLAYBACK_MODES,
    getRepository: () => ({}) as PDialogueRepository,
    isPlaybackEnabled: () => true,
    playback,
  })

const flushPlaybackFailure = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('createEntryEventPlayback', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('should allow retrying after playback failure before committing the session', async () => {
    const {playback, playSequence} = createPlayback()
    const failure = new Error('playback failed')
    playSequence.mockRejectedValueOnce(failure).mockResolvedValueOnce(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const entryPlayback = createEntryPlayback(playback)
    entryPlayback.enterFocusRoom()

    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBeNull()

    await flushPlaybackFailure()
    entryPlayback.tryPlay()

    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBeNull()

    await Promise.resolve()

    expect(playSequence).toHaveBeenCalledTimes(2)
    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBe('true')

    entryPlayback.tryPlay()

    expect(playSequence).toHaveBeenCalledTimes(2)
  })

  it('should ignore repeated attempts while playback is pending', async () => {
    const {playback, playSequence} = createPlayback()
    const pendingPlayback = Promise.withResolvers<void>()
    playSequence.mockReturnValue(pendingPlayback.promise)

    const entryPlayback = createEntryPlayback(playback)
    entryPlayback.enterFocusRoom()
    entryPlayback.tryPlay()

    expect(playSequence).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBeNull()

    pendingPlayback.resolve()
    await pendingPlayback.promise

    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBe('true')
  })
})
