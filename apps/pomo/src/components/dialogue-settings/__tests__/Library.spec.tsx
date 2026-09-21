/** @vitest-environment jsdom */

import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {type JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  type PDialogue,
  type PEventContextValue,
  usePEvents,
} from '../../../features/focus-room-dialogue'
import {DialogueLibrary} from '../Library'

vi.mock('@solidjs/router', () => ({
  A: (props: {readonly children?: JSX.Element; readonly href: string}) => (
    <a href={props.href}>{props.children}</a>
  ),
}))
vi.mock('../../../features/focus-room-dialogue', async () => {
  const actual: typeof import('../../../features/focus-room-dialogue') = await vi.importActual(
    '../../../features/focus-room-dialogue',
  )

  return {...actual, usePEvents: vi.fn()}
})

const DIALOGUE: PDialogue = {
  audioKey: 'audio-dialogue-1',
  createdAt: '2026-08-14T00:00:00.000Z',
  durationMs: 1000,
  id: 'dialogue-1',
  language: 'ko',
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
  text: '안녕하세요',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}

const SECOND_DIALOGUE = {
  ...DIALOGUE,
  audioKey: 'audio-dialogue-2',
  id: 'dialogue-2',
} satisfies PDialogue

const createEvents = (overrides: Partial<PEventContextValue> = {}): PEventContextValue => ({
  activeDialogueId: () => null,
  activeSegmentCount: () => 0,
  activeSegmentMood: () => null,
  activeSegmentPosition: () => null,
  activeText: () => null,
  activeViseme: () => 'rest',
  cancelDelayedEndEvent: vi.fn(),
  delayedEndEventDurationMinutes: () => 30,
  delayedEndEventIsRunning: () => false,
  deleteDialogue: vi.fn(async () => undefined),
  dialogues: () => [DIALOGUE],
  enterFocusRoom: vi.fn(),
  entryDialogueId: () => null,
  entryDialogueIds: () => [],
  errorMessage: () => null,
  eventActionIds: () => ({}),
  eventDialogueIds: () => ({}),
  eventPlaybackModes: () => ({}),
  getAudio: vi.fn(async () => null),
  hasEnteredFocusRoom: () => true,
  isDialoguePlaybackBlocked: () => false,
  isDialoguePlaying: () => false,
  isDialogueScheduled: () => false,
  isEntryPlaybackBlocked: () => false,
  isLoading: () => false,
  onStopDialoguePlayback: vi.fn(),
  onStopEntryPlayback: vi.fn(),
  playDialogue: vi.fn(async () => true),
  playDialogueEvents: vi.fn(async () => undefined),
  playDialogueSequence: vi.fn(async () => undefined),
  refreshDialogues: vi.fn(async () => undefined),
  registerEventActionExecutor: vi.fn(() => vi.fn()),
  retryDialoguePlayback: vi.fn(),
  retryEntryPlayback: vi.fn(),
  scheduledDialogueCount: () => 0,
  setDelayedEndEventDuration: vi.fn(async () => undefined),
  setEntryDialogue: vi.fn(async () => undefined),
  setEntryDialogues: vi.fn(async () => undefined),
  setEventDialogue: vi.fn(async () => undefined),
  setEventDialogues: vi.fn(async () => undefined),
  setEventItems: vi.fn(async () => undefined),
  setEventPlaybackMode: vi.fn(async () => undefined),
  skipDialoguePlayback: vi.fn(),
  startDelayedEndEvent: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(usePEvents).mockReturnValue(createEvents())
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should use a custom deletion handler for the selected dialogue', async () => {
  const onDelete = vi.fn(async () => undefined)

  render(() => <DialogueLibrary entries={[{dialogue: DIALOGUE}]} onDelete={onDelete} />)

  fireEvent.click(screen.getByRole('button', {name: '삭제'}))
  fireEvent.click(screen.getByRole('button', {name: '삭제 확인'}))

  await vi.waitFor(() => expect(onDelete).toHaveBeenCalledWith(DIALOGUE))
  expect(vi.mocked(usePEvents)().deleteDialogue).not.toHaveBeenCalled()
})

it('should ignore a superseded character playback request', async () => {
  const firstAudio = Promise.withResolvers<Blob>()
  const secondAudio = Promise.withResolvers<Blob>()
  const secondDialogue = {...DIALOGUE, id: 'dialogue-2', text: '두 번째 대화'}
  const events = createEvents()
  vi.mocked(events.getAudio)
    .mockImplementationOnce(() => firstAudio.promise)
    .mockImplementationOnce(() => secondAudio.promise)
  vi.mocked(usePEvents).mockReturnValue(events)
  const onRequestClose = vi.fn()

  render(() => (
    <DialogueLibrary
      entries={[{dialogue: DIALOGUE}, {dialogue: secondDialogue}]}
      onRequestClose={onRequestClose}
    />
  ))

  const rows = within(screen.getByRole('list', {name: '저장된 대화'})).getAllByRole('listitem')
  fireEvent.click(within(rows[0]!).getByRole('button', {name: '캐릭터로 듣기'}))
  fireEvent.click(within(rows[1]!).getByRole('button', {name: '캐릭터로 듣기'}))
  firstAudio.resolve(new Blob(['first audio']))
  secondAudio.resolve(new Blob(['second audio']))

  await vi.waitFor(() => expect(events.playDialogue).toHaveBeenCalledOnce())
  expect(events.playDialogue).toHaveBeenCalledWith(secondDialogue.id)
  expect(onRequestClose).toHaveBeenCalledOnce()
})

it('should not close the library for character playback superseded after starting', async () => {
  const firstPlayback = Promise.withResolvers<boolean>()
  const secondDialogue = {...DIALOGUE, id: 'dialogue-2', text: '두 번째 대화'}
  const events = createEvents({
    getAudio: vi.fn(async () => new Blob(['audio'])),
    playDialogue: vi
      .fn()
      .mockImplementationOnce(() => firstPlayback.promise)
      .mockResolvedValueOnce(true),
  })
  vi.mocked(usePEvents).mockReturnValue(events)
  const onRequestClose = vi.fn()

  render(() => (
    <DialogueLibrary
      entries={[{dialogue: DIALOGUE}, {dialogue: secondDialogue}]}
      onRequestClose={onRequestClose}
    />
  ))

  const rows = within(screen.getByRole('list', {name: '저장된 대화'})).getAllByRole('listitem')
  fireEvent.click(within(rows[0]!).getByRole('button', {name: '캐릭터로 듣기'}))
  await vi.waitFor(() => expect(events.playDialogue).toHaveBeenCalledWith(DIALOGUE.id))
  fireEvent.click(within(rows[1]!).getByRole('button', {name: '캐릭터로 듣기'}))
  await vi.waitFor(() => expect(events.playDialogue).toHaveBeenCalledWith(secondDialogue.id))
  await vi.waitFor(() => expect(onRequestClose).toHaveBeenCalledOnce())

  firstPlayback.resolve(true)
  await firstPlayback.promise
  expect(onRequestClose).toHaveBeenCalledOnce()
})

it('should keep the library open when character playback does not start', async () => {
  const events = createEvents({
    getAudio: vi.fn(async () => new Blob(['audio'])),
    playDialogue: vi.fn(async () => false),
  })
  vi.mocked(usePEvents).mockReturnValue(events)
  const onRequestClose = vi.fn()

  render(() => <DialogueLibrary entries={[{dialogue: DIALOGUE}]} onRequestClose={onRequestClose} />)

  fireEvent.click(screen.getByRole('button', {name: '캐릭터로 듣기'}))

  await vi.waitFor(() => expect(events.playDialogue).toHaveBeenCalledWith(DIALOGUE.id))
  expect(onRequestClose).not.toHaveBeenCalled()
})

it('should not play a superseded inline request after audio preparation', async () => {
  const secondAudio = Promise.withResolvers<Blob>()
  const events = createEvents()
  vi.mocked(events.getAudio)
    .mockResolvedValueOnce(new Blob(['first audio']))
    .mockImplementationOnce(() => secondAudio.promise)
  vi.mocked(usePEvents).mockReturnValue(events)

  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  render(() => <DialogueLibrary entries={[{dialogue: DIALOGUE}, {dialogue: SECOND_DIALOGUE}]} />)
  const listenButtons = screen.getAllByRole('button', {name: '듣기'})
  let didReplaceRequest = false
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    if (!didReplaceRequest) {
      didReplaceRequest = true
      fireEvent.click(listenButtons[1]!)
    }

    return 'blob:dialogue'
  })

  fireEvent.click(listenButtons[0]!)
  await vi.waitFor(() => expect(events.getAudio).toHaveBeenCalledTimes(2))
  expect(play).not.toHaveBeenCalled()

  secondAudio.resolve(new Blob(['second audio']))
  await vi.waitFor(() => expect(play).toHaveBeenCalledOnce())
})
