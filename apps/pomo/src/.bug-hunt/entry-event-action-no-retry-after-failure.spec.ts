/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {EntryPlaybackController} from '../features/focus-room-dialogue/entry-playback-controller'
import type {EventDialogueIds, EventPlaybackModes} from '../features/focus-room-dialogue/event-context'
import type {PDialogueRepository} from '../features/focus-room-dialogue/repository'
import {createEntryEventPlayback} from '../features/focus-room-dialogue/use-p-event-controller/entry-playback'

const ENTRY_DIALOGUE_IDS: EventDialogueIds = {'room-enter': ['dialogue-1']}
const ENTRY_PLAYBACK_MODES: EventPlaybackModes = {'room-enter': 'sequential-all'}

describe('entry event action retry after failure', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('should retry the room-enter event action before playing entry dialogue after a failure', async () => {
    const playSequence = vi
      .fn<EntryPlaybackController['playSequence']>()
      .mockResolvedValue('ended')
    const onEvent = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('room-enter action failed'))
      .mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const entryPlayback = createEntryEventPlayback({
      eventDialogueIds: () => ENTRY_DIALOGUE_IDS,
      eventPlaybackModes: () => ENTRY_PLAYBACK_MODES,
      getRepository: () => ({}) as PDialogueRepository,
      isPlaybackEnabled: () => true,
      onEvent,
      playback: {playSequence} as unknown as EntryPlaybackController,
    })

    entryPlayback.enterFocusRoom()
    await Promise.resolve()
    await Promise.resolve()

    expect(onEvent).toHaveBeenCalledOnce()
    expect(playSequence).not.toHaveBeenCalled()

    entryPlayback.tryPlay()
    await Promise.resolve()
    await Promise.resolve()

    expect(onEvent).toHaveBeenCalledTimes(2)
    expect(playSequence).toHaveBeenCalledOnce()
  })
})
