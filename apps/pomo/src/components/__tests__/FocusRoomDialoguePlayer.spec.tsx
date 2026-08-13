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
  const onStopDialoguePlayback = vi.fn()
  const events: FocusRoomEventContextValue = {
    activeSegmentCount: () => 3,
    activeSegmentPosition: () => 1,
    activeText: () => '집중을 시작해 볼까요?',
    deleteDialogue: vi.fn(async () => undefined),
    dialogues: () => [],
    errorMessage: () => null,
    eventDialogueIds: () => ({}),
    getAudio: vi.fn(async () => null),
    isDialoguePlaybackBlocked: () => false,
    isLoading: () => false,
    onStopDialoguePlayback,
    playDialogueEvents: vi.fn(async () => undefined),
    retryDialoguePlayback: vi.fn(),
    setEventDialogue: vi.fn(async () => undefined),
  }
  vi.mocked(useFocusRoomEvents).mockReturnValue(events)

  const result = render(() => <FocusRoomDialoguePlayer />)
  const dialogueBubble = result.container.querySelector('.focus-room-dialogue-bubble')

  expect(dialogueBubble?.classList.contains('focus-room-static-focus-glass')).toBe(true)
  expect(screen.getByRole('img', {name: '총 3개 중 2번째 대사 읽는 중'})).toBeDefined()
  const progressDots = result.container.querySelectorAll(
    '.focus-room-dialogue-bubble__progress-dot',
  )
  expect(progressDots).toHaveLength(3)
  expect(
    result.container.querySelectorAll('.focus-room-dialogue-bubble__progress-dot[data-complete]'),
  ).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', {name: '음성 중지'}))

  expect(onStopDialoguePlayback).toHaveBeenCalledOnce()
})

it('should route the stop action to an external speech owner', () => {
  const onStopDialoguePlayback = vi.fn()
  const onStopExternalSpeech = vi.fn()
  const events: FocusRoomEventContextValue = {
    activeSegmentCount: () => 3,
    activeSegmentPosition: () => 1,
    activeText: () => '기존 입장 대사',
    deleteDialogue: vi.fn(async () => undefined),
    dialogues: () => [],
    errorMessage: () => null,
    eventDialogueIds: () => ({}),
    getAudio: vi.fn(async () => null),
    isDialoguePlaybackBlocked: () => true,
    isLoading: () => false,
    onStopDialoguePlayback,
    playDialogueEvents: vi.fn(async () => undefined),
    retryDialoguePlayback: vi.fn(),
    setEventDialogue: vi.fn(async () => undefined),
  }
  vi.mocked(useFocusRoomEvents).mockReturnValue(events)

  render(() => (
    <FocusRoomDialoguePlayer
      externalText="WebMCP 대사"
      onStopExternalSpeech={onStopExternalSpeech}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '음성 중지'}))

  expect(screen.getByText('WebMCP 대사').textContent).toBe('WebMCP 대사')
  expect(screen.queryByRole('img', {name: /번째 대사 읽는 중/})).toBeNull()
  expect(screen.queryByRole('button', {name: /이벤트 음성 재생/})).toBeNull()
  expect(onStopExternalSpeech).toHaveBeenCalledOnce()
  expect(onStopDialoguePlayback).not.toHaveBeenCalled()
})

it('should keep the blocked playback action on the static focus surface', () => {
  const retryDialoguePlayback = vi.fn()
  const events: FocusRoomEventContextValue = {
    activeSegmentCount: () => 0,
    activeSegmentPosition: () => null,
    activeText: () => null,
    deleteDialogue: vi.fn(async () => undefined),
    dialogues: () => [],
    errorMessage: () => null,
    eventDialogueIds: () => ({}),
    getAudio: vi.fn(async () => null),
    isDialoguePlaybackBlocked: () => true,
    isLoading: () => false,
    onStopDialoguePlayback: vi.fn(),
    playDialogueEvents: vi.fn(async () => undefined),
    retryDialoguePlayback,
    setEventDialogue: vi.fn(async () => undefined),
  }
  vi.mocked(useFocusRoomEvents).mockReturnValue(events)

  render(() => <FocusRoomDialoguePlayer />)
  const playbackButton = screen.getByRole('button', {name: /이벤트 음성 재생/})

  expect(playbackButton.classList.contains('focus-room-static-focus-glass')).toBe(true)
  fireEvent.click(playbackButton)
  expect(retryDialoguePlayback).toHaveBeenCalledOnce()
})
