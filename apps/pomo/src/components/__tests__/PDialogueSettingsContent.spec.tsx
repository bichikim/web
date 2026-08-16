/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {PSelect} from 'src/design-system/PSelect'
import {type PDialogue, type PEventContextValue, usePEvents} from 'src/features/focus-room-dialogue'
import {type PFeedController, usePFeedContext} from 'src/features/focus-room-feed'
import PDialogueSettingsContent from '../PDialogueSettingsContent'

vi.mock('@kobalte/core/tabs', () => ({Tabs: {Content: vi.fn()}}))
vi.mock('@kobalte/core/dropdown-menu', () => {
  const Container = (props: {children?: JSX.Element}) => <>{props.children}</>

  return {
    DropdownMenu: Object.assign(Container, {
      CheckboxItem: Container,
      Content: Container,
      Icon: Container,
      Item: Container,
      ItemIndicator: Container,
      Portal: Container,
      Trigger: Container,
    }),
  }
})
vi.mock('@solidjs/router', () => ({
  A: (props: {children: JSX.Element; class?: string; href: string}) => (
    <a class={props.class} href={props.href}>
      {props.children}
    </a>
  ),
}))
vi.mock('src/design-system/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('src/features/focus-room-dialogue', async () => {
  const actual: typeof import('src/features/focus-room-dialogue') = await vi.importActual(
    'src/features/focus-room-dialogue',
  )

  return {...actual, usePEvents: vi.fn()}
})
vi.mock('src/features/focus-room-feed', () => ({
  excludeFeedDialogues: (dialogues: ReadonlyArray<PDialogue>) => dialogues,
  usePFeedContext: vi.fn(),
}))

const DIALOGUE: PDialogue = {
  audioKey: 'audio-saved',
  createdAt: '2026-08-15T00:00:00.000Z',
  durationMs: 1000,
  id: 'saved-dialogue',
  language: 'ko',
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '저장된 대화'}],
  text: '저장된 대화',
  updatedAt: '2026-08-15T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}

const createEvents = (overrides: Partial<PEventContextValue> = {}): PEventContextValue => ({
  activeDialogueId: () => null,
  activeSegmentCount: () => 0,
  activeSegmentMood: () => null,
  activeSegmentPosition: () => null,
  activeText: () => null,
  deleteDialogue: vi.fn(async () => undefined),
  dialogues: () => [DIALOGUE],
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

const createFeeds = (): PFeedController => ({
  deleteRecovery: vi.fn(async () => undefined),
  dialogues: () => [],
  dismissRecovery: vi.fn(),
  isListening: () => false,
  issues: () => [],
  latestReady: () => null,
  listen: vi.fn(async () => undefined),
  listenAll: vi.fn(async () => undefined),
  onDeleteDialogue: vi.fn(async () => undefined),
  recoveryJobs: () => [],
  retryRecovery: vi.fn(async () => undefined),
  state: () => ({message: '대기 중', status: 'idle'}),
  syncNow: vi.fn(async () => undefined),
  unlistenedDialogues: () => [],
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(Tabs.Content).mockImplementation((props) => <>{props.children}</>)
  vi.mocked(PSelect).mockImplementation(() => null)
  vi.mocked(usePFeedContext).mockReturnValue(createFeeds())
})

it('should play a saved dialogue once through the character without changing event bindings', () => {
  const onRequestClose = vi.fn()
  const events = createEvents()
  vi.mocked(usePEvents).mockReturnValue(events)

  render(() => <PDialogueSettingsContent onRequestClose={onRequestClose} />)
  fireEvent.click(screen.getByRole('button', {name: '캐릭터로 듣기'}))

  expect(events.onStopDialoguePlayback).toHaveBeenCalledOnce()
  expect(events.playDialogue).toHaveBeenCalledWith(DIALOGUE.id)
  expect(events.setEventDialogues).not.toHaveBeenCalled()
  expect(onRequestClose).toHaveBeenCalledOnce()
})
