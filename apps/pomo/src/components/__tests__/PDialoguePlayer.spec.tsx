/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {type PEventContextValue, usePEvents} from '../../features/focus-room-dialogue/PEventContext'
import type {DialogueSegmentMood} from '../../features/focus-room-dialogue/schema'
import {PDialoguePlayer} from '../PDialoguePlayer'

vi.mock('../../features/focus-room-dialogue/PEventContext', () => ({
  usePEvents: vi.fn(),
}))

const createEvents = (overrides: Partial<PEventContextValue> = {}): PEventContextValue => ({
  activeDialogueId: () => null,
  activeSegmentCount: () => 0,
  activeSegmentMood: () => null,
  activeSegmentPosition: () => null,
  activeText: () => null,
  deleteDialogue: vi.fn(async () => undefined),
  dialogues: () => [],
  enterFocusRoom: vi.fn(),
  entryDialogueId: () => null,
  entryDialogueIds: () => [],
  errorMessage: () => null,
  eventDialogueIds: () => ({}),
  getAudio: vi.fn(async () => null),
  hasEnteredFocusRoom: () => true,
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
  scheduledDialogueCount: () => 0,
  setEntryDialogue: vi.fn(async () => undefined),
  setEntryDialogues: vi.fn(async () => undefined),
  setEventDialogue: vi.fn(async () => undefined),
  setEventDialogues: vi.fn(async () => undefined),
  skipDialoguePlayback: vi.fn(),
  ...overrides,
})

const cheerfulMood = {
  margin: 0.7,
  modifiers: [],
  primary: {id: 'cheerful', probability: 0.85},
  scores: [{id: 'cheerful', probability: 0.85}],
  secondary: null,
  uncertain: false,
} satisfies DialogueSegmentMood

afterEach(() => {
  vi.clearAllMocks()
})

it('should show segment progress and stop the current dialogue playback', () => {
  const onStopDialoguePlayback = vi.fn()
  const skipDialoguePlayback = vi.fn()
  vi.mocked(usePEvents).mockReturnValue(
    createEvents({
      activeSegmentCount: () => 3,
      activeSegmentMood: () => cheerfulMood,
      activeSegmentPosition: () => 1,
      activeText: () => '집중을 시작해 볼까요?',
      onStopDialoguePlayback,
      scheduledDialogueCount: () => 3,
      skipDialoguePlayback,
    }),
  )

  const result = render(() => <PDialoguePlayer />)

  expect(
    result.container
      .querySelector('.pomo-dialogue-bubble')
      ?.classList.contains('pomo-static-focus-glass'),
  ).toBe(true)
  expect(screen.getByRole('img', {name: '총 3개 중 2번째 대사 읽는 중'})).toBeDefined()
  expect(screen.getByRole('img', {name: '밝음·즐거움 감정'})).toBeDefined()
  expect(screen.queryByText('Pomo')).toBeNull()
  expect(
    result.container.querySelectorAll('.pomo-dialogue-bubble__progress-dot[data-complete]'),
  ).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', {name: '대화 건너뛰기'}))
  expect(skipDialoguePlayback).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', {name: '3개 모두 중지'}))
  expect(onStopDialoguePlayback).toHaveBeenCalledOnce()
})

it('should show the neutral face when an active segment has no mood analysis', () => {
  vi.mocked(usePEvents).mockReturnValue(
    createEvents({activeText: () => '감정 분석 결과가 없는 대사'}),
  )

  render(() => <PDialoguePlayer />)

  expect(screen.getByRole('img', {name: '중립 감정'})).toBeDefined()
})

it('should route the stop action to an external speech owner', () => {
  const onStopDialoguePlayback = vi.fn()
  const onStopExternalSpeech = vi.fn()
  vi.mocked(usePEvents).mockReturnValue(
    createEvents({
      activeSegmentCount: () => 3,
      activeSegmentPosition: () => 1,
      activeText: () => '기존 입장 대사',
      isDialoguePlaybackBlocked: () => true,
      onStopDialoguePlayback,
    }),
  )

  render(() => (
    <PDialoguePlayer externalText="WebMCP 대사" onStopExternalSpeech={onStopExternalSpeech} />
  ))
  fireEvent.click(screen.getByRole('button', {name: '1개 모두 중지'}))

  expect(screen.getByText('WebMCP 대사').textContent).toBe('WebMCP 대사')
  expect(screen.getByRole('img', {name: '중립 감정'})).toBeDefined()
  expect(screen.queryByRole('img', {name: /번째 대사 읽는 중/})).toBeNull()
  expect(screen.queryByRole('button', {name: '대화 건너뛰기'})).toBeNull()
  expect(screen.queryByRole('button', {name: /이벤트 음성 재생/})).toBeNull()
  expect(onStopExternalSpeech).toHaveBeenCalledOnce()
  expect(onStopDialoguePlayback).not.toHaveBeenCalled()
})

it('should keep one dialogue container between queued dialogue items', () => {
  const [activeText, setActiveText] = createSignal<string | null>('첫 번째 대화')
  const [scheduledDialogueCount, setScheduledDialogueCount] = createSignal(2)
  vi.mocked(usePEvents).mockReturnValue(createEvents({activeText, scheduledDialogueCount}))

  const result = render(() => <PDialoguePlayer />)
  const dialogueBubble = result.container.querySelector('.pomo-dialogue-bubble')

  setActiveText(null)
  expect(result.container.querySelector('.pomo-dialogue-bubble')).toBe(dialogueBubble)
  expect(screen.getByRole('status').textContent).toBe('첫 번째 대화')

  setActiveText('두 번째 대화')
  expect(result.container.querySelector('.pomo-dialogue-bubble')).toBe(dialogueBubble)
  expect(screen.getByRole('status').textContent).toBe('두 번째 대화')

  setActiveText(null)
  setScheduledDialogueCount(0)
  expect(result.container.querySelector('.pomo-dialogue-bubble')).toBeNull()
})

it('should retry blocked playback from the static focus surface', () => {
  const retryDialoguePlayback = vi.fn()
  vi.mocked(usePEvents).mockReturnValue(
    createEvents({isDialoguePlaybackBlocked: () => true, retryDialoguePlayback}),
  )

  render(() => <PDialoguePlayer />)
  const playbackButton = screen.getByRole('button', {name: /이벤트 음성 재생/})

  expect(playbackButton.classList.contains('pomo-static-focus-glass')).toBe(true)
  fireEvent.click(playbackButton)
  expect(retryDialoguePlayback).toHaveBeenCalledOnce()
})
