/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  type FocusRoomEventContextValue,
  FocusRoomEventProvider,
  useFocusRoomEvents,
} from '../FocusRoomEventContext'
import type {FocusRoomDialogue} from '../schema'

const repositoryMocks = vi.hoisted(() => ({create: vi.fn()}))

vi.mock('../repository', () => ({
  createFocusRoomDialogueRepository: repositoryMocks.create,
}))

const DIALOGUE: FocusRoomDialogue = {
  audioKey: 'entry-audio',
  createdAt: '2026-08-13T00:00:00.000Z',
  durationMs: 1000,
  id: 'entry-dialogue',
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '입장 대사'}],
  text: '입장 대사',
  updatedAt: '2026-08-13T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:entry-dialogue'),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should release entry audio after an unexpected playback failure', async () => {
  const repository = {
    deleteDialogue: vi.fn(),
    dispose: vi.fn(),
    getAudio: vi.fn(async () => new Blob(['audio'])),
    getDialogue: vi.fn(async () => DIALOGUE),
    getEntryBinding: vi.fn(async () => ({
      dialogueId: DIALOGUE.id,
      event: 'room-enter' as const,
      version: 1 as const,
    })),
    listDialogues: vi.fn(async () => [DIALOGUE]),
    saveDialogue: vi.fn(),
    setEntryBinding: vi.fn(),
  }
  repositoryMocks.create.mockReturnValue(repository)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('decoder failed'))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const eventReference: {current?: FocusRoomEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = useFocusRoomEvents()
    return null
  }
  const result = render(() => (
    <FocusRoomEventProvider>
      <Consumer />
    </FocusRoomEventProvider>
  ))

  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:entry-dialogue'))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  expect(events.activeText()).toBeNull()
  expect(events.isEntryPlaybackBlocked()).toBe(false)

  result.unmount()
  expect(repository.dispose).toHaveBeenCalledOnce()
})
