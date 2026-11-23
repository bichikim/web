/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, For, type JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {
  type PDialogue,
  type PEventContextValue,
  usePEvents,
} from '../../../features/focus-room-dialogue'
import {
  readLanguageLearningSentences,
  writeLanguageLearningSentences,
} from '../../../features/language-learning'
import {PSelect} from '../../p-select/PSelect'
import {LanguageLearningLibrary} from '../Library'

vi.mock('../../p-select/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('../../../features/focus-room-dialogue', async () => {
  const actual: typeof import('../../../features/focus-room-dialogue') = await vi.importActual(
    '../../../features/focus-room-dialogue',
  )
  return {...actual, usePEvents: vi.fn()}
})
vi.mock('@solidjs/router', () => ({
  A: (props: {readonly children?: JSX.Element; readonly class?: string; readonly href: string}) => (
    <a class={props.class} href={props.href}>
      {props.children}
    </a>
  ),
}))

const createDialogue = (id: string, language: PDialogue['language'], text: string): PDialogue => ({
  audioKey: `audio-${id}`,
  createdAt: '2026-08-28T00:00:00.000Z',
  durationMs: 1000,
  id,
  language,
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text}],
  text,
  updatedAt: '2026-08-28T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
})

const ENGLISH_DIALOGUE = createDialogue('dialogue-en', 'en', 'I am home.')
const JAPANESE_DIALOGUE = createDialogue('dialogue-ja', 'ja', '家に帰ります。')

const createEvents = (): PEventContextValue => ({
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
  dialogues: () => [ENGLISH_DIALOGUE, JAPANESE_DIALOGUE],
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
})

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(usePEvents).mockReturnValue(createEvents())
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.mocked(PSelect).mockImplementation((props) => {
    if (props.multiple === true) {
      return null
    }

    return (
      <label>
        {props.label}
        <select onChange={(event) => props.onChange(event.currentTarget.value)} value={props.value}>
          <For each={props.options}>
            {(option) => <option value={option.value}>{option.label}</option>}
          </For>
        </select>
      </label>
    )
  })
})

const renderLearningLibrary = () => {
  const events = createEvents()
  vi.mocked(events.getAudio).mockResolvedValue(new Blob(['audio']))
  vi.mocked(usePEvents).mockReturnValue(events)
  writeLanguageLearningSentences([
    {
      createdAt: '2026-08-28T00:00:00.000Z',
      dialogueId: 'dialogue-en',
      language: 'en',
      tags: ['home'],
      text: 'I am home.',
      version: 1,
    },
    {
      createdAt: '2026-08-28T00:00:00.000Z',
      dialogueId: 'dialogue-ja',
      language: 'ja',
      tags: ['家'],
      text: '家に帰ります。',
      version: 1,
    },
  ])
  const view = render(() => <LanguageLearningLibrary />)
  return {events, view}
}

it('should use the shared select with initial language-filtered saved sentences', () => {
  const {view} = renderLearningLibrary()

  expect(PSelect).toHaveBeenCalledWith(
    expect.objectContaining({
      class: 'min-w-40',
      label: '학습 언어',
      options: [
        {label: '한국어', value: 'ko'},
        {label: '영어', value: 'en'},
        {label: '일본어', value: 'ja'},
      ],
      value: 'en',
    }),
  )
  expect(screen.getByText('I am home.').className).toContain('[-webkit-line-clamp:6]')
  expect(screen.queryByText('家に帰ります。')).toBeNull()
  const createLink = screen.getByRole('link', {name: '학습 문장 만들기'})
  const controls = createLink.parentElement

  expect(controls?.className).toContain('flex-col')
  expect(controls?.className).toContain('md:flex-row')
  expect(controls?.className).not.toContain('flex-wrap')
  expect(createLink.className).toContain('rounded-control')
  expect(createLink.className).toContain('border-highlight')
  view.unmount()
})

it('should filter saved sentences and retain actions for the selected language', () => {
  const {view} = renderLearningLibrary()
  fireEvent.change(screen.getByRole('combobox', {name: '학습 언어'}), {
    target: {value: 'ja'},
  })

  expect(screen.queryByText('I am home.')).toBeNull()
  expect(screen.getByText('家に帰ります。')).toBeDefined()
  expect(screen.queryByText(/사용 단어/u)).toBeNull()
  expect(screen.queryByText(/말풍선/u)).toBeNull()
  expect(screen.getByRole('button', {name: '듣기'})).toBeDefined()
  expect(screen.getByRole('button', {name: '캐릭터로 듣기'})).toBeDefined()
  expect(screen.getByRole('link', {name: '편집'}).getAttribute('href')).toBe(
    '/dialogue?dialogueId=dialogue-ja',
  )
  expect(screen.getByRole('button', {name: '삭제'})).toBeDefined()
  view.unmount()
})

it('should switch from the initial language, play, and remove on the same mount', async () => {
  const {events, view} = renderLearningLibrary()
  expect(screen.getByRole('combobox', {name: '학습 언어'})).toHaveValue('en')
  expect(screen.getByText('I am home.')).toBeDefined()
  expect(screen.queryByText('家に帰ります。')).toBeNull()

  fireEvent.change(screen.getByRole('combobox', {name: '학습 언어'}), {
    target: {value: 'ja'},
  })
  expect(screen.getByRole('combobox', {name: '학습 언어'})).toHaveValue('ja')
  expect(screen.queryByText('I am home.')).toBeNull()
  expect(screen.getByText('家に帰ります。')).toBeDefined()
  expect(screen.queryByText(/사용 단어/u)).toBeNull()
  expect(screen.queryByText(/말풍선/u)).toBeNull()
  expect(screen.getByRole('button', {name: '듣기'})).toBeDefined()
  expect(screen.getByRole('button', {name: '캐릭터로 듣기'})).toBeDefined()
  expect(screen.getByRole('link', {name: '편집'}).getAttribute('href')).toBe(
    '/dialogue?dialogueId=dialogue-ja',
  )
  fireEvent.click(screen.getByRole('button', {name: '캐릭터로 듣기'}))
  await Promise.resolve()
  await Promise.resolve()
  expect(events.playDialogue).toHaveBeenCalledWith('dialogue-ja')

  fireEvent.click(screen.getByRole('button', {name: '삭제'}))
  fireEvent.click(screen.getByRole('button', {name: '삭제 확인'}))
  await Promise.resolve()
  expect(events.deleteDialogue).toHaveBeenCalledWith('dialogue-ja')
  expect(readLanguageLearningSentences()).toEqual([
    {
      createdAt: '2026-08-28T00:00:00.000Z',
      dialogueId: 'dialogue-en',
      language: 'en',
      tags: ['home'],
      text: 'I am home.',
      version: 1,
    },
  ])
  view.unmount()
})

it('should hide stale learning records without a saved dialogue', () => {
  writeLanguageLearningSentences([
    {
      createdAt: '2026-08-28T00:00:00.000Z',
      dialogueId: 'missing-dialogue',
      language: 'en',
      tags: ['missing'],
      text: 'Missing dialogue.',
      version: 1,
    },
  ])

  const result = render(() => <LanguageLearningLibrary />)

  expect(screen.getByText('저장된 학습 문장이 없어요.')).toBeDefined()

  result.unmount()
})

it('should filter an edited learning dialogue by its current language', () => {
  writeLanguageLearningSentences([
    {
      createdAt: '2026-08-28T00:00:00.000Z',
      dialogueId: 'dialogue-ja',
      language: 'en',
      tags: ['home'],
      text: 'I am home.',
      version: 1,
    },
  ])

  const result = render(() => <LanguageLearningLibrary />)

  expect(screen.queryByText('家に帰ります。')).toBeNull()
  fireEvent.change(screen.getByRole('combobox', {name: '학습 언어'}), {
    target: {value: 'ja'},
  })
  expect(screen.getByText('家に帰ります。')).toBeDefined()

  result.unmount()
})

it('should retain saved order and the first matching dialogue before filtering language', () => {
  const first = createDialogue('first', 'en', 'First current text.')
  const second = createDialogue('second', 'en', 'Second current text.')
  vi.mocked(usePEvents).mockReturnValue({
    ...createEvents(),
    dialogues: () => [
      first,
      createDialogue('hidden', 'ja', '最初の一致'),
      second,
      createDialogue('first', 'en', 'Later duplicate.'),
      createDialogue('hidden', 'en', 'Later English duplicate.'),
    ],
  })
  writeLanguageLearningSentences(
    ['second', 'missing', 'hidden', 'first'].map((dialogueId) => ({
      createdAt: '2026-08-28T00:00:00.000Z',
      dialogueId,
      language: 'en',
      tags: [],
      text: 'Stored text.',
      version: 1,
    })),
  )

  const view = render(() => <LanguageLearningLibrary />)

  expect(
    screen.getAllByRole('link', {name: '편집'}).map((link) => link.getAttribute('href')),
  ).toEqual(['/dialogue?dialogueId=second', '/dialogue?dialogueId=first'])
  expect(screen.getByText(second.text)).toBeDefined()
  expect(screen.getByText(first.text)).toBeDefined()
  expect(screen.queryByText('Later duplicate.')).toBeNull()
  expect(screen.queryByText('Later English duplicate.')).toBeNull()
  view.unmount()
})

it('should refresh saved entries when current dialogues change on the same mount', () => {
  const [dialogues, setDialogues] = createSignal([ENGLISH_DIALOGUE])
  vi.mocked(usePEvents).mockReturnValue({...createEvents(), dialogues})
  writeLanguageLearningSentences([
    {
      createdAt: '2026-08-28T00:00:00.000Z',
      dialogueId: ENGLISH_DIALOGUE.id,
      language: 'en',
      tags: [],
      text: ENGLISH_DIALOGUE.text,
      version: 1,
    },
  ])
  const view = render(() => <LanguageLearningLibrary />)
  const editLink = screen.getByRole('link', {name: '편집'})

  setDialogues([createDialogue(ENGLISH_DIALOGUE.id, 'en', 'Updated current text.')])
  expect(screen.getByText('Updated current text.')).toBeDefined()
  expect(screen.queryByText(ENGLISH_DIALOGUE.text)).toBeNull()
  expect(screen.getByRole('link', {name: '편집'})).toBe(editLink)

  setDialogues([createDialogue(ENGLISH_DIALOGUE.id, 'ja', '今の文章')])
  expect(screen.getByText('저장된 학습 문장이 없어요.')).toBeDefined()
  fireEvent.change(screen.getByRole('combobox', {name: '학습 언어'}), {
    target: {value: 'ja'},
  })
  expect(screen.getByText('今の文章')).toBeDefined()

  setDialogues([])
  expect(screen.getByText('저장된 학습 문장이 없어요.')).toBeDefined()
  setDialogues([createDialogue(ENGLISH_DIALOGUE.id, 'ja', '戻った文章')])
  expect(screen.getByText('戻った文章')).toBeDefined()
  view.unmount()
})

it('should leave current dialogues unread when no learning sentences are saved', () => {
  const dialogues = vi.fn((): readonly PDialogue[] => {
    throw new Error('The empty library must not read dialogues.')
  })
  vi.mocked(usePEvents).mockReturnValue({...createEvents(), dialogues})

  const view = render(() => <LanguageLearningLibrary />)

  expect(screen.getByText('저장된 학습 문장이 없어요.')).toBeDefined()
  expect(dialogues).not.toHaveBeenCalled()
  view.unmount()
})
