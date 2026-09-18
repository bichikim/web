/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {EntryPlaybackController} from '../entry-playback-controller'
import type {EventDialogueIds, EventPlaybackModes} from '../event-context'
import {
  createEntryEventPlayback,
  type EntryPlaybackSessionStorage,
} from '../use-p-event-controller/entry-playback'
import {FOCUS_ROOM_ENTRY_EVENT} from '../schema'
import type {PDialogueRepository} from '../repository'

const createRepository = (): PDialogueRepository => ({
  deleteDialogue: async () => undefined,
  dispose: () => undefined,
  getAudio: async () => null,
  getDialogue: async () => null,
  listDialogues: async () => [],
  listEventBindings: async () => [],
  saveDialogue: async () => undefined,
  setEntryBinding: async () => undefined,
  setEventBinding: async () => undefined,
})

const createPlayback = (playSequence: EntryPlaybackController['playSequence']) =>
  ({
    activeDialogueId: () => null,
    activeSegmentCount: () => 0,
    activeSegmentMood: () => null,
    activeSegmentPosition: () => null,
    activeText: () => null,
    activeViseme: () => 'rest' as const,
    cancel: () => undefined,
    dispose: () => undefined,
    isBlocked: () => false,
    isDialogueScheduled: () => false,
    isPlaying: () => false,
    playSequence,
    prepare: async () => false,
    retry: () => undefined,
    scheduledDialogueCount: () => 0,
    skip: () => undefined,
    stop: () => undefined,
  }) satisfies EntryPlaybackController

const createStorage = (): EntryPlaybackSessionStorage => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

it('should persist completed entry playback in the injected session storage', async () => {
  const storage = createStorage()
  const repository = createRepository()
  const eventDialogueIds: EventDialogueIds = {[FOCUS_ROOM_ENTRY_EVENT]: ['dialogue-1']}
  const eventPlaybackModes: EventPlaybackModes = {
    [FOCUS_ROOM_ENTRY_EVENT]: 'sequential-all',
  }
  const completion =
    Promise.withResolvers<Awaited<ReturnType<EntryPlaybackController['playSequence']>>>()
  const playSequence = vi.fn<EntryPlaybackController['playSequence']>(() => completion.promise)
  const playback = createPlayback(async (...args) => {
    expect(storage.getItem('pomo:focus-room-entry-playback:v1')).toBeNull()
    return playSequence(...args)
  })

  createRoot((dispose) => {
    const entryPlayback = createEntryEventPlayback({
      eventDialogueIds: () => eventDialogueIds,
      eventPlaybackModes: () => eventPlaybackModes,
      getRepository: () => repository,
      isPlaybackEnabled: () => true,
      playback,
      sessionStorage: storage,
    })

    entryPlayback.enterFocusRoom()
    entryPlayback.tryPlay()
    dispose()
  })

  expect(playSequence).toHaveBeenCalledOnce()
  expect(storage.getItem('pomo:focus-room-entry-playback:v1')).toBeNull()
  completion.resolve('ended')
  await vi.waitFor(() => {
    expect(storage.getItem('pomo:focus-room-entry-playback:v1')).toBe('true')
  })
})
