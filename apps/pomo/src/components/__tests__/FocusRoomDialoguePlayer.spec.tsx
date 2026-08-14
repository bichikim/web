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

const createEvents = (
  overrides: Partial<FocusRoomEventContextValue> = {},
): FocusRoomEventContextValue => ({
  activeDialogueId: () => null,
  activeSegmentCount: () => 0,
  activeSegmentPosition: () => null,
  activeText: () => null,
  deleteDialogue: vi.fn(async () => undefined),
  dialogues: () => [],
  entryDialogueId: () => null,
  entryDialogueIds: () => [],
  errorMessage: () => null,
  eventDialogueIds: () => ({}),
  getAudio: vi.fn(async () => null),
  isDialoguePlaybackBlocked: () => false,
  isDialogueScheduled: () => false,
  isEntryPlaybackBlocked: () => false,
  isLoading: () => false,
  onStopDialoguePlayback: vi.fn(),
  onStopEntryPlayback: vi.fn(),
  playDialogue: vi.fn(async () => undefined),
  playDialogueEvents: vi.fn(async () => undefined),
  playDialogueSequence: vi.fn(async () => undefined),
  refreshDialogues: vi.fn(async () => undefined),
  retryDialoguePlayback: vi.fn(),
  retryEntryPlayback: vi.fn(),
  setEntryDialogue: vi.fn(async () => undefined),
  setEntryDialogues: vi.fn(async () => undefined),
  setEventDialogue: vi.fn(async () => undefined),
  setEventDialogues: vi.fn(async () => undefined),
  ...overrides,
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should show segment progress and stop the current dialogue playback', () => {
  const onStopDialoguePlayback = vi.fn()
  vi.mocked(useFocusRoomEvents).mockReturnValue(
    createEvents({
      activeSegmentCount: () => 3,
      activeSegmentPosition: () => 1,
      activeText: () => '집중을 시작해 볼까요?',
      onStopDialoguePlayback,
    }),
  )

  const result = render(() => <FocusRoomDialoguePlayer />)

  expect(
    result.container
      .querySelector('.focus-room-dialogue-bubble')
      ?.classList.contains('focus-room-static-focus-glass'),
  ).toBe(true)
  expect(screen.getByRole('img', {name: '총 3개 중 2번째 대사 읽는 중'})).toBeDefined()
  expect(
    result.container.querySelectorAll('.focus-room-dialogue-bubble__progress-dot[data-complete]'),
  ).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', {name: '음성 중지'}))
  expect(onStopDialoguePlayback).toHaveBeenCalledOnce()
})

it('should route the stop action to an external speech owner', () => {
  const onStopDialoguePlayback = vi.fn()
  const onStopExternalSpeech = vi.fn()
  vi.mocked(useFocusRoomEvents).mockReturnValue(
    createEvents({
      activeSegmentCount: () => 3,
      activeSegmentPosition: () => 1,
      activeText: () => '기존 입장 대사',
      isDialoguePlaybackBlocked: () => true,
      onStopDialoguePlayback,
    }),
  )

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

it('should retry blocked playback from the static focus surface', () => {
  const retryDialoguePlayback = vi.fn()
  vi.mocked(useFocusRoomEvents).mockReturnValue(
    createEvents({isDialoguePlaybackBlocked: () => true, retryDialoguePlayback}),
  )

  render(() => <FocusRoomDialoguePlayer />)
  const playbackButton = screen.getByRole('button', {name: /이벤트 음성 재생/})

  expect(playbackButton.classList.contains('focus-room-static-focus-glass')).toBe(true)
  fireEvent.click(playbackButton)
  expect(retryDialoguePlayback).toHaveBeenCalledOnce()
})
