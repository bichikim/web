/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {
  type FocusRoomEventContextValue,
  useFocusRoomEvents,
} from '../../features/focus-room-dialogue/FocusRoomEventContext'
import {FocusRoomDialoguePlayer} from '../FocusRoomDialoguePlayer'

vi.mock('../../features/focus-room-dialogue/FocusRoomEventContext', () => ({
  useFocusRoomEvents: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

it('should stop the current voice playback from the dialogue bubble', () => {
  const onStopEntryPlayback = vi.fn()
  const events: FocusRoomEventContextValue = {
    activeDialogueId: () => null,
    activeText: () => '집중을 시작해 볼까요?',
    deleteDialogue: vi.fn(async () => undefined),
    dialogues: () => [],
    entryDialogueId: () => null,
    entryDialogueIds: () => [],
    errorMessage: () => null,
    getAudio: vi.fn(async () => null),
    isDialogueScheduled: () => false,
    isEntryPlaybackBlocked: () => false,
    isLoading: () => false,
    onStopEntryPlayback,
    playDialogue: vi.fn(async () => undefined),
    playDialogueSequence: vi.fn(async () => undefined),
    refreshDialogues: vi.fn(async () => undefined),
    retryEntryPlayback: vi.fn(),
    setEntryDialogue: vi.fn(async () => undefined),
    setEntryDialogues: vi.fn(async () => undefined),
  }
  vi.mocked(useFocusRoomEvents).mockReturnValue(events)

  render(() => <FocusRoomDialoguePlayer />)
  fireEvent.click(screen.getByRole('button', {name: '음성 중지'}))

  expect(onStopEntryPlayback).toHaveBeenCalledOnce()
})

it('should retry blocked entry playback from the dialogue flow', () => {
  const retryEntryPlayback = vi.fn()
  const events: FocusRoomEventContextValue = {
    activeDialogueId: () => null,
    activeText: () => null,
    deleteDialogue: vi.fn(async () => undefined),
    dialogues: () => [],
    entryDialogueId: () => null,
    entryDialogueIds: () => [],
    errorMessage: () => null,
    getAudio: vi.fn(async () => null),
    isDialogueScheduled: () => false,
    isEntryPlaybackBlocked: () => true,
    isLoading: () => false,
    onStopEntryPlayback: vi.fn(),
    playDialogue: vi.fn(async () => undefined),
    playDialogueSequence: vi.fn(async () => undefined),
    refreshDialogues: vi.fn(async () => undefined),
    retryEntryPlayback,
    setEntryDialogue: vi.fn(async () => undefined),
    setEntryDialogues: vi.fn(async () => undefined),
  }
  vi.mocked(useFocusRoomEvents).mockReturnValue(events)

  render(() => <FocusRoomDialoguePlayer />)
  fireEvent.click(screen.getByRole('button', {name: /이벤트 메시지를 재생하려면/}))

  expect(retryEntryPlayback).toHaveBeenCalledOnce()
})
