/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {EntryPlaybackController} from '../features/focus-room-dialogue/entry-playback-controller'
import type {EventDialogueIds, EventPlaybackModes} from '../features/focus-room-dialogue/event-context'
import {FOCUS_ROOM_ENTRY_EVENT} from '../features/focus-room-dialogue/schema'
import type {PDialogueRepository} from '../features/focus-room-dialogue/repository'
import {createEntryEventPlayback} from '../features/focus-room-dialogue/use-p-event-controller/entry-playback'
import {createRuntimeOptionResetManager} from '../features/dev-option-reset'

const storage = vi.hoisted(() => ({getItem: vi.fn(), removeItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: storage}))

const ENTRY_PLAYBACK_SESSION_KEY = 'pomo:focus-room-entry-playback:v1'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.resetAllMocks()
  Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
  storage.getItem.mockResolvedValue(null)
  storage.removeItem.mockResolvedValue(undefined)
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
})

it('should allow entry dialogue playback again after resetting the entry option group', async () => {
  sessionStorage.setItem(ENTRY_PLAYBACK_SESSION_KEY, 'true')

  const playSequence = vi.fn<EntryPlaybackController['playSequence']>().mockResolvedValue('ended')
  const playback = {
    playSequence,
  } as unknown as EntryPlaybackController
  const eventDialogueIds: EventDialogueIds = {[FOCUS_ROOM_ENTRY_EVENT]: ['dialogue-1']}
  const eventPlaybackModes: EventPlaybackModes = {[FOCUS_ROOM_ENTRY_EVENT]: 'sequential-all'}

  const entryPlayback = createEntryEventPlayback({
    eventDialogueIds: () => eventDialogueIds,
    eventPlaybackModes: () => eventPlaybackModes,
    getRepository: () => ({}) as PDialogueRepository,
    isPlaybackEnabled: () => true,
    playback,
  })

  entryPlayback.enterFocusRoom()
  expect(playSequence).not.toHaveBeenCalled()

  await expect(createRuntimeOptionResetManager().reset('entry')).resolves.toEqual({
    status: 'complete',
  })

  entryPlayback.tryPlay()
  expect(playSequence).toHaveBeenCalledOnce()
})
