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
    activeText: () => '집중을 시작해 볼까요?',
    deleteDialogue: vi.fn(async () => undefined),
    dialogues: () => [],
    entryDialogueId: () => null,
    errorMessage: () => null,
    getAudio: vi.fn(async () => null),
    isEntryPlaybackBlocked: () => false,
    isLoading: () => false,
    onStopEntryPlayback,
    retryEntryPlayback: vi.fn(),
    setEntryDialogue: vi.fn(async () => undefined),
  }
  vi.mocked(useFocusRoomEvents).mockReturnValue(events)

  render(() => <FocusRoomDialoguePlayer />)
  fireEvent.click(screen.getByRole('button', {name: '음성 중지'}))

  expect(onStopEntryPlayback).toHaveBeenCalledOnce()
})
