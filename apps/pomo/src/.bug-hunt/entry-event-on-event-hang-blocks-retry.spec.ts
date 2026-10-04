/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

import type {EntryPlaybackController} from '../features/focus-room-dialogue/entry-playback-controller'
import type {
  EventDialogueIds,
  EventPlaybackModes,
} from '../features/focus-room-dialogue/event-context'
import type {PDialogueRepository} from '../features/focus-room-dialogue/repository'
import {createEntryEventPlayback} from '../features/focus-room-dialogue/use-p-event-controller/entry-playback'

const ENTRY_DIALOGUE_IDS: EventDialogueIds = {'room-enter': ['dialogue']}
const ENTRY_PLAYBACK_MODES: EventPlaybackModes = {'room-enter': 'sequential-all'}

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

it('should allow retrying the entry event when onEvent never settles', () => {
  const playSequence = vi.fn<EntryPlaybackController['playSequence']>()
  const playback = {playSequence} as unknown as EntryPlaybackController
  const onEvent = vi.fn<() => Promise<void>>(() => new Promise(() => undefined))

  const entryPlayback = createEntryEventPlayback({
    eventDialogueIds: () => ENTRY_DIALOGUE_IDS,
    eventPlaybackModes: () => ENTRY_PLAYBACK_MODES,
    getRepository: () => ({}) as PDialogueRepository,
    isPlaybackEnabled: () => true,
    onEvent,
    playback,
  })

  entryPlayback.enterFocusRoom()
  entryPlayback.tryPlay()

  expect(onEvent).toHaveBeenCalledOnce()
  expect(playSequence).not.toHaveBeenCalled()

  entryPlayback.tryPlay()

  expect(onEvent).toHaveBeenCalledTimes(2)
})
