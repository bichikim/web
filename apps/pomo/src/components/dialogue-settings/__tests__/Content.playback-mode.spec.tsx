/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, For, type JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'
import type {DialogueEventId, PDialogue} from '../../../features/focus-room-dialogue/schema'
import type {FeedDialogueListItem} from '../../../features/focus-room-feed/feed-controller'
import {PDialogueSettingsContent} from '../Content'

const fixture = vi.hoisted(() => ({
  events: (): unknown => undefined,
  feeds: (): ReadonlyArray<FeedDialogueListItem> => [],
}))

vi.mock('@kobalte/core/tabs', () => ({
  Tabs: {
    Content: (props: {readonly children: JSX.Element; readonly value: string}) =>
      props.value === 'events' ? props.children : null,
  },
}))
vi.mock('../../../features/focus-room-dialogue', async () => ({
  ...(await import('../../../features/focus-room-dialogue/schema')),
  usePEvents: () => fixture.events(),
}))
vi.mock('../../../features/focus-room-feed', async () => ({
  ...(await import('../../../features/focus-room-feed/dialogue-library')),
  usePFeedContext: () => ({dialogues: () => fixture.feeds()}),
}))
vi.mock('../../../features/language-learning', async () => ({
  ...(await import('../../../features/language-learning/dialogue-library')),
  useLanguageLearningSentences: () => () => [],
}))
vi.mock('../../../features/memory-assist', async () => ({
  ...(await import('../../../features/memory-assist/dialogue-library')),
}))
vi.mock('../ConnectionMenu', () => ({DialogueConnectionMenu: () => null}))
vi.mock('../DelayedEndEventSettings', () => ({DelayedEndEventSettings: () => null}))
vi.mock('../RandomEventSettings', () => ({RandomEventSettings: () => null}))
vi.mock('../VolumeDuckingSettings', () => ({DialogueVolumeDuckingSettings: () => null}))
vi.mock('../Library', () => ({DialogueLibrary: () => null}))
vi.mock('@solidjs/router', () => ({A: () => null}))
vi.mock('../../p-select/PSelect', () => ({
  PSelect: (props: {
    readonly accessibleLabel: string
    readonly onChange: (value: string) => void
    readonly options: ReadonlyArray<{readonly label: string; readonly value: string}>
    readonly value: string
  }) => (
    <select
      aria-label={props.accessibleLabel}
      onChange={(event) => props.onChange(event.currentTarget.value)}
      value={props.value}
    >
      <For each={props.options}>
        {(option) => <option value={option.value}>{option.label}</option>}
      </For>
    </select>
  ),
}))

const createDialogue = (id: string): PDialogue => ({
  audioKey: `audio-${id}`,
  createdAt: '2026-08-15T00:00:00.000Z',
  durationMs: 1000,
  id,
  language: 'ko',
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: id}],
  text: id,
  updatedAt: '2026-08-15T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
})

type SelectedIds = Partial<Record<DialogueEventId, ReadonlyArray<string>>>

const createEvents = () => ({
  dialogues: () => [createDialogue('first'), createDialogue('second')],
  errorMessage: () => null,
  eventActionIds: () => ({}),
  eventDialogueIds: (): SelectedIds => ({}),
  eventPlaybackModes: () => ({}),
  isLoading: () => false,
  setEventItems: vi.fn(async () => undefined),
  setEventPlaybackMode: vi.fn(async () => undefined),
})

beforeEach(() => {
  fixture.feeds = () => []
})

it.each([
  {ids: [], visible: false},
  {ids: ['first'], visible: false},
  {ids: ['first', 'missing'], visible: false},
  {ids: ['missing', 'second', 'first'], visible: true},
  {ids: ['first', 'first'], visible: true},
])('should show playback modes for two existing references: $ids', ({ids, visible}) => {
  fixture.events = () => ({
    ...createEvents(),
    eventDialogueIds: () => ({'focus-start': ids}),
  })

  const view = render(() => <PDialogueSettingsContent />)

  expect(screen.queryByRole('combobox', {name: '포모도르 집중 시작 재생 방식'}) !== null).toBe(
    visible,
  )
  view.unmount()
})

it('should count references rather than duplicate catalog entries or connected actions', () => {
  fixture.events = () => ({
    ...createEvents(),
    dialogues: () => [createDialogue('first'), createDialogue('first')],
    eventActionIds: () => ({'focus-end': ['music-start', 'music-stop']}),
    eventDialogueIds: () => ({'focus-start': ['first']}),
  })

  const view = render(() => <PDialogueSettingsContent />)

  expect(screen.queryByRole('combobox', {name: '포모도르 집중 시작 재생 방식'})).toBeNull()
  expect(screen.queryByRole('combobox', {name: '포모도르 집중 끝 재생 방식'})).toBeNull()
  view.unmount()
})

it('should retain the current selector and follow reference and dialogue changes', () => {
  const [dialogues, setDialogues] = createSignal([
    createDialogue('first'),
    createDialogue('second'),
  ])
  const [ids, setIds] = createSignal<SelectedIds>({'focus-start': ['first', 'second']})
  const events = {...createEvents(), dialogues, eventDialogueIds: ids}
  fixture.events = () => events
  const view = render(() => <PDialogueSettingsContent />)
  const selector = screen.getByRole('combobox', {name: '포모도르 집중 시작 재생 방식'})
  selector.focus()

  setDialogues([createDialogue('second'), {...createDialogue('first'), text: 'Edited text'}])
  expect(screen.getByRole('combobox', {name: '포모도르 집중 시작 재생 방식'})).toBe(selector)
  expect(selector).toHaveFocus()
  fireEvent.change(selector, {target: {value: 'random-one'}})
  expect(events.setEventPlaybackMode).toHaveBeenCalledExactlyOnceWith('focus-start', 'random-one')

  setIds({'focus-start': ['first', 'missing'], 'room-enter': ['first', 'second']})
  expect(screen.queryByRole('combobox', {name: '포모도르 집중 시작 재생 방식'})).toBeNull()
  expect(screen.getByRole('combobox', {name: '입장 재생 방식'})).toBeDefined()
  setDialogues([createDialogue('first')])
  expect(screen.queryByRole('combobox', {name: '입장 재생 방식'})).toBeNull()
  setDialogues([createDialogue('missing'), createDialogue('first')])
  expect(screen.getByRole('combobox', {name: '포모도르 집중 시작 재생 방식'})).toBeDefined()
  view.unmount()
})

it('should apply feed exclusion before counting while retaining memo event references', () => {
  const feed = createDialogue('feed')
  fixture.feeds = () => [
    {
      dialogue: feed,
      metadata: {
        createdAt: feed.createdAt,
        dialogueId: feed.id,
        expiresAt: feed.createdAt,
        feedConnectionId: 'connection',
        feedItemId: 'item',
        itemTitle: 'Item',
        listenedAt: null,
        publishedAt: feed.createdAt,
        sourceTitle: 'Source',
        sourceUrl: 'https://example.com/feed',
        version: 1,
      },
    },
  ]
  fixture.events = () => ({
    ...createEvents(),
    dialogues: () => [createDialogue('first'), feed, createDialogue('memory-memo-example')],
    eventDialogueIds: () => ({
      'focus-start': ['first', 'feed'],
      'room-enter': ['first', 'memory-memo-example'],
    }),
  })

  const view = render(() => <PDialogueSettingsContent />)

  expect(screen.queryByRole('combobox', {name: '포모도르 집중 시작 재생 방식'})).toBeNull()
  expect(screen.getByRole('combobox', {name: '입장 재생 방식'})).toBeDefined()
  view.unmount()
})
