/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {For, type JSX} from 'solid-js'
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
  activeViseme: () => 'rest',
  deleteDialogue: vi.fn(async () => undefined),
  dialogues: () => [DIALOGUE],
  enterFocusRoom: vi.fn(),
  entryDialogueId: () => null,
  entryDialogueIds: () => [],
  errorMessage: () => null,
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
  setEventPlaybackMode: vi.fn(async () => undefined),
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

it('should keep saved dialogue content full-width with bounded text and actions', () => {
  vi.mocked(usePEvents).mockReturnValue(createEvents())

  render(() => <PDialogueSettingsContent />)

  const library = screen.getByRole('list', {name: '저장된 대화'})
  const summary = within(library).getByText(DIALOGUE.text)
  const row = summary.closest('.pomo-dialogue-settings__selected-dialogue--library')
  const listenButton = within(library).getByRole('button', {name: '듣기'})

  expect(row?.className).toContain('max-md:items-stretch')
  expect(summary.className).toContain('[-webkit-line-clamp:3]')
  expect(listenButton.textContent).toBe('듣기')
  expect(screen.getByRole('link', {name: '새 대화'}).getAttribute('href')).toBe('/dialogue')
  expect(within(library).getByRole('link', {name: '편집'}).getAttribute('href')).toBe(
    '/dialogue?dialogueId=saved-dialogue',
  )

  fireEvent.click(within(library).getByRole('button', {name: '삭제'}))
  expect(
    within(library)
      .getByRole('button', {name: '삭제 확인'})
      .hasAttribute('data-pomo-dialogue-delete-confirm'),
  ).toBe(true)
})

it('should apply compact spacing to dialogue settings groups', () => {
  vi.mocked(usePEvents).mockReturnValue(createEvents())

  const result = render(() => <PDialogueSettingsContent />)
  const section = result.container.querySelector('.pomo-dialogue-settings') as HTMLElement
  const list = result.container.querySelector('.pomo-dialogue-settings__list') as HTMLElement
  const automatic = result.container.querySelector(
    '.pomo-dialogue-settings__automatic',
  ) as HTMLElement

  expect(section.classList.contains('settings-compact:gap-4')).toBe(true)
  expect(list.classList.contains('settings-compact:gap-2')).toBe(true)
  expect(list.classList.contains('settings-compact:[&_>_li]:gap-2')).toBe(true)
  expect(automatic.classList.contains('settings-compact:gap-3')).toBe(true)
})

it('should offer and save a playback mode when an event has multiple dialogues', () => {
  const secondDialogue = {
    ...DIALOGUE,
    audioKey: 'audio-second',
    id: 'second-dialogue',
    text: '두 번째 대화',
  } satisfies PDialogue
  const events = createEvents({
    dialogues: () => [DIALOGUE, secondDialogue],
    eventDialogueIds: () => ({'focus-start': [DIALOGUE.id, secondDialogue.id]}),
    eventPlaybackModes: () => ({'focus-start': 'random-all'}),
  })
  vi.mocked(PSelect).mockImplementation((selectProps) => {
    if (selectProps.multiple === true) {
      const selectedOptions = selectProps.options.filter((option) =>
        selectProps.value.includes(option.value),
      )

      return (
        <button aria-label={selectProps.accessibleLabel} type="button">
          {selectedOptions.length === 0
            ? selectProps.placeholder
            : selectProps.selectionLabel?.(selectedOptions)}
        </button>
      )
    }

    return (
      <label>
        {selectProps.label}
        <select
          aria-label={selectProps.accessibleLabel}
          onChange={(event) => selectProps.onChange(event.currentTarget.value)}
          value={selectProps.value}
        >
          <For each={selectProps.options}>
            {(option) => <option value={option.value}>{option.label}</option>}
          </For>
        </select>
      </label>
    )
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.mocked(usePEvents).mockReturnValue(events)

  const result = render(() => <PDialogueSettingsContent />)

  const modeSelect = screen.getByRole('combobox', {name: '포모도르 집중 시작 재생 방식'})
  const settingRows = result.container.querySelectorAll(
    '.pomo-dialogue-settings__event-setting-row',
  )
  const modeLayout = modeSelect.closest('.pomo-dialogue-settings__event-setting-row')
  const modeControlLayout = modeLayout?.lastElementChild
  expect((modeSelect as HTMLSelectElement).value).toBe('random-all')
  expect(settingRows).toHaveLength(10)
  expect(modeLayout?.classList).toContain('grid-cols-[minmax(12rem,_2fr)_minmax(16rem,_5fr)]')
  expect(modeLayout?.classList).toContain('settings-compact:grid-cols-[1fr]')
  expect(modeControlLayout?.classList).toContain('w-full')
  expect(screen.getByText('2개 대화 연결됨')).toBeDefined()
  expect(screen.getAllByText('대화 선택')).toHaveLength(7)
  expect(screen.getByRole('button', {name: '포모도르 집중 시작 대화 연결'})).toBeDefined()
  expect(screen.getByRole('button', {name: '포모도르 휴식 시작 대화 연결'})).toBeDefined()
  expect(screen.getByRole('button', {name: '포모도르 휴식 종료 대화 연결'})).toBeDefined()
  expect(screen.getByRole('button', {name: '포모도르 긴 휴식 시작 대화 연결'})).toBeDefined()
  expect(screen.getByRole('button', {name: '포모도르 긴 휴식 종료 대화 연결'})).toBeDefined()
  expect(screen.getByRole('button', {name: '랜덤 이벤트 대화 연결'})).toBeDefined()
  expect(screen.queryByRole('switch', {name: '랜덤 이벤트 사용'})).toBeNull()
  expect(screen.getByRole('button', {name: '입장 대화 연결'})).toBeDefined()
  expect(screen.getByText('이벤트가 발생할 때마다 모든 대화의 순서를 섞어요.')).toBeDefined()
  expect(screen.queryByRole('list', {name: '포모도르 집중 시작 대화 재생 대상'})).toBeNull()

  fireEvent.change(modeSelect, {target: {value: 'random-one'}})
  expect(events.setEventPlaybackMode).toHaveBeenCalledWith('focus-start', 'random-one')
})

it('should queue a saved dialogue through the character without stopping existing playback', () => {
  const onRequestClose = vi.fn()
  const events = createEvents()
  const pauseAudio = vi
    .spyOn(HTMLMediaElement.prototype, 'pause')
    .mockImplementation(() => undefined)
  const loadAudio = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.mocked(usePEvents).mockReturnValue(events)

  render(() => <PDialogueSettingsContent onRequestClose={onRequestClose} />)
  fireEvent.click(screen.getByRole('button', {name: '캐릭터로 듣기'}))

  expect(pauseAudio).toHaveBeenCalledOnce()
  expect(loadAudio).toHaveBeenCalledOnce()
  expect(events.onStopDialoguePlayback).not.toHaveBeenCalled()
  expect(events.playDialogue).toHaveBeenCalledWith(DIALOGUE.id)
  expect(events.setEventDialogues).not.toHaveBeenCalled()
  expect(onRequestClose).toHaveBeenCalledOnce()
})
