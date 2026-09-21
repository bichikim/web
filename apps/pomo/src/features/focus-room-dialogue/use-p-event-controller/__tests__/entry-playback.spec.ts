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

const createEntryPlayback = (playback: EntryPlaybackController, onEvent: () => void = vi.fn()) =>
  createEntryEventPlayback({
    eventDialogueIds: () => ENTRY_DIALOGUE_IDS,
    eventPlaybackModes: () => ENTRY_PLAYBACK_MODES,
    getRepository: () => ({}) as PDialogueRepository,
    isPlaybackEnabled: () => true,
    onEvent,
    playback,
  })

const mockSuccessfulPlayback = (
  playSequence: ReturnType<typeof createPlayback>['playSequence'],
) => {
  playSequence.mockImplementationOnce((_repository, options) => {
    void options.onDialogueStart('dialogue')
    return Promise.resolve('ended')
  })
}

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
    playSequence.mockRejectedValueOnce(failure)
    mockSuccessfulPlayback(playSequence)
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

  it.each(['failed', 'cancelled'] as const)(
    'should allow retrying after a %s playback completion',
    async (completion) => {
      const {playback, playSequence} = createPlayback()
      playSequence.mockResolvedValueOnce(completion)
      mockSuccessfulPlayback(playSequence)

      const entryPlayback = createEntryPlayback(playback)
      entryPlayback.enterFocusRoom()
      await Promise.resolve()

      expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBeNull()

      entryPlayback.tryPlay()
      await Promise.resolve()

      expect(playSequence).toHaveBeenCalledTimes(2)
      expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBe('true')
    },
  )

  it('should allow retrying after the user stops playback', async () => {
    const {playback, playSequence} = createPlayback()
    playSequence.mockImplementationOnce((_repository, options) => {
      void options.onDialogueStart('dialogue')
      return Promise.resolve('stopped')
    })
    mockSuccessfulPlayback(playSequence)

    const entryPlayback = createEntryPlayback(playback)
    entryPlayback.enterFocusRoom()
    await Promise.resolve()

    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBeNull()

    entryPlayback.tryPlay()
    await Promise.resolve()

    expect(playSequence).toHaveBeenCalledTimes(2)
    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBe('true')
  })

  it('should allow retrying when playback ends without starting a dialogue', async () => {
    const {playback, playSequence} = createPlayback()
    playSequence.mockResolvedValueOnce('ended')
    mockSuccessfulPlayback(playSequence)

    const entryPlayback = createEntryPlayback(playback)
    entryPlayback.enterFocusRoom()
    await Promise.resolve()

    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBeNull()

    entryPlayback.tryPlay()
    await Promise.resolve()

    expect(playSequence).toHaveBeenCalledTimes(2)
    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBe('true')
  })

  it('should ignore repeated attempts while playback is pending', async () => {
    const {playback, playSequence} = createPlayback()
    const pendingPlayback = Promise.withResolvers<'ended'>()
    playSequence.mockImplementation((_repository, options) => {
      void options.onDialogueStart('dialogue')
      return pendingPlayback.promise
    })

    const entryPlayback = createEntryPlayback(playback)
    entryPlayback.enterFocusRoom()
    entryPlayback.tryPlay()

    expect(playSequence).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBeNull()

    pendingPlayback.resolve('ended')
    await pendingPlayback.promise

    expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBe('true')
  })

  it('should retry the entry event after its execution fails', async () => {
    const {playback, playSequence} = createPlayback()
    const eventFailure = new Error('entry event failed')
    const onEvent = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(eventFailure)
      .mockResolvedValueOnce(undefined)
    playSequence.mockResolvedValueOnce('ended')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const entryPlayback = createEntryEventPlayback({
      eventDialogueIds: () => ENTRY_DIALOGUE_IDS,
      eventPlaybackModes: () => ENTRY_PLAYBACK_MODES,
      getRepository: () => ({}) as PDialogueRepository,
      isPlaybackEnabled: () => true,
      onEvent,
      playback,
    })
    entryPlayback.enterFocusRoom()

    await flushPlaybackFailure()
    entryPlayback.tryPlay()

    expect(onEvent).toHaveBeenCalledTimes(2)
    expect(playSequence).not.toHaveBeenCalled()

    await flushPlaybackFailure()

    expect(playSequence).toHaveBeenCalledOnce()
  })

  it('should trigger the entry event even when it has no dialogue binding', () => {
    const {playback} = createPlayback()
    const onEvent = vi.fn()
    const entryPlayback = createEntryEventPlayback({
      eventDialogueIds: () => ({}),
      eventPlaybackModes: () => ({}),
      getRepository: () => ({}) as PDialogueRepository,
      isPlaybackEnabled: () => true,
      onEvent,
      playback,
    })

    entryPlayback.enterFocusRoom()
    entryPlayback.enterFocusRoom()

    expect(onEvent).toHaveBeenCalledOnce()
    expect(playback.playSequence).not.toHaveBeenCalled()
  })
})
