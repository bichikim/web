/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type PDialogue,
  type PEventContextValue,
  usePEvents,
} from '../../../features/focus-room-dialogue'
import {type PFeedController, usePFeedContext} from '../../../features/focus-room-feed'

vi.mock('@kobalte/core/tabs', () => ({Tabs: {Content: vi.fn()}}))
vi.mock('solid-js', async () => {
  const actual: typeof import('solid-js') = await vi.importActual('solid-js')

  return {...actual, createSignal: vi.fn(actual.createSignal)}
})
vi.mock('@solidjs/router', () => ({
  A: (props: {readonly children: JSX.Element; readonly class?: string; readonly href: string}) => (
    <a class={props.class} href={props.href}>
      {props.children}
    </a>
  ),
}))
vi.mock('../../../features/focus-room-dialogue', async () => {
  const actual: typeof import('../../../features/focus-room-dialogue') = await vi.importActual(
    '../../../features/focus-room-dialogue',
  )
  return {...actual, usePEvents: vi.fn()}
})
vi.mock('../../../features/focus-room-feed', () => ({
  excludeFeedDialogues: (dialogues: ReadonlyArray<PDialogue>) => dialogues,
  usePFeedContext: vi.fn(),
}))
vi.mock('../AutomaticSettings', () => ({AutomaticDialogueSettings: () => <div>자동 설정</div>}))
vi.mock('../RandomEventSettings', () => ({RandomEventSettings: () => <div>랜덤 설정</div>}))
vi.mock('../EventSettingRow', () => ({
  DialogueEventSettingRow: (props: {
    readonly children: JSX.Element
    readonly description: string
    readonly label: string
  }) => (
    <section data-description={props.description}>
      <h4>{props.label}</h4>
      {props.children}
    </section>
  ),
}))
vi.mock('../ConnectionMenu', () => ({
  DialogueConnectionMenu: (props: {
    readonly accessibleLabel: string
    readonly dialogues: ReadonlyArray<PDialogue>
    readonly disabled: boolean
    readonly getMetadata: (dialogue: PDialogue) => string
    readonly onChange: (dialogueIds: ReadonlyArray<string>) => void
    readonly selectedDialogueIds: ReadonlyArray<string>
  }) => (
    <button
      aria-label={props.accessibleLabel}
      data-metadata={props.dialogues.map((dialogue) => props.getMetadata(dialogue)).join('|')}
      data-selected-dialogues={props.selectedDialogueIds.join(',')}
      disabled={props.disabled}
      onClick={() => props.onChange(props.dialogues.map((dialogue) => dialogue.id))}
      type="button"
    >
      연결
    </button>
  ),
}))
vi.mock('../PlaybackModeSelect', () => ({
  DialoguePlaybackModeSelect: (props: {
    readonly eventLabel: string
    readonly onChange: (value: 'random-all' | 'random-one' | 'sequential') => void
    readonly value: string
  }) => (
    <button data-mode={props.value} onClick={() => props.onChange('random-one')} type="button">
      {props.eventLabel} 재생 방식
    </button>
  ),
}))
vi.mock('../PlaybackButton', () => ({
  DialoguePlaybackButton: (props: {readonly isPlaying: boolean; readonly onPress: () => void}) => (
    <button aria-pressed={props.isPlaying} onClick={props.onPress} type="button">
      듣기
    </button>
  ),
}))

import PDialogueSettingsContent from '../Content'

const DIALOGUE: PDialogue = {
  audioKey: 'audio-key',
  createdAt: '2026-08-15T00:00:00.000Z',
  durationMs: 61_200,
  id: 'saved-dialogue',
  language: 'ko',
  modelId: 'full',
  segments: [{durationMs: 61_200, index: 0, startMs: 0, text: '저장된 대화'}],
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

const FEEDS: PFeedController = {
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
  retryRecovery: vi.fn(),
  state: () => ({message: '대기 중', status: 'idle'}),
  syncNow: vi.fn(async () => undefined),
  unlistenedDialogues: () => [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Tabs.Content).mockImplementation((props) => <>{props.children}</>)
  vi.mocked(usePFeedContext).mockReturnValue(FEEDS)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

describe('PDialogueSettingsContent', () => {
  it('should bind event dialogues, modes, and expose saved dialogue controls', async () => {
    const second = {
      ...DIALOGUE,
      id: 'second-dialogue',
      text: '두 번째 대화',
      voiceId: 'retired-voice' as PDialogue['voiceId'],
    } satisfies PDialogue
    const events = createEvents({
      dialogues: () => [DIALOGUE, second],
      eventDialogueIds: () => ({
        'focus-start': [DIALOGUE.id, second.id],
        'room-enter': ['missing'],
      }),
      eventPlaybackModes: () => ({'focus-start': 'random-all'}),
    })
    vi.mocked(usePEvents).mockReturnValue(events)
    render(() => <PDialogueSettingsContent onRequestClose={vi.fn()} />)

    expect(screen.getAllByText('Yuna · 1:01 · 1개 말풍선')).toHaveLength(1)
    expect(screen.getByRole('button', {name: '입장 대화 연결'})).toHaveAttribute(
      'data-metadata',
      'Yuna · 1:01 · 1개 말풍선|retired-voice · 1:01 · 1개 말풍선',
    )
    fireEvent.click(screen.getByRole('button', {name: '포모도르 집중 시작 대화 연결'}))
    fireEvent.click(screen.getByRole('button', {name: '포모도르 집중 시작 재생 방식'}))
    fireEvent.click(screen.getAllByRole('button', {name: '삭제'})[0]!)
    fireEvent.click(screen.getByRole('button', {name: '취소'}))
    fireEvent.click(screen.getAllByRole('button', {name: '삭제'})[0]!)
    fireEvent.click(screen.getByRole('button', {name: '삭제 확인'}))

    expect(events.setEventDialogues).toHaveBeenCalledWith('focus-start', [DIALOGUE.id, second.id])
    expect(events.setEventPlaybackMode).toHaveBeenCalledWith('focus-start', 'random-one')
    expect(events.deleteDialogue).toHaveBeenCalledWith(DIALOGUE.id)
  })

  it('should report loading, empty, and failed event updates', async () => {
    const events = createEvents({
      dialogues: () => [],
      errorMessage: () => '저장소 오류',
      isLoading: () => true,
      setEventDialogues: vi.fn(async () => {
        throw new Error('failed')
      }),
    })
    vi.mocked(usePEvents).mockReturnValue(events)
    render(() => <PDialogueSettingsContent />)

    expect(screen.getByText('이벤트와 대화를 불러오는 중')).toBeInTheDocument()
    expect(screen.getByText('대화를 불러오는 중')).toBeInTheDocument()
    expect(screen.getAllByText('저장소 오류')).toHaveLength(2)
  })

  it('should handle saved audio playback, character playback, and missing audio', async () => {
    const onRequestClose = vi.fn()
    const missingAudioEvents = createEvents()
    vi.mocked(usePEvents).mockReturnValue(missingAudioEvents)
    render(() => <PDialogueSettingsContent onRequestClose={onRequestClose} />)

    fireEvent.click(screen.getByRole('button', {name: '듣기'}))
    await vi.waitFor(() =>
      expect(
        screen.getAllByText('저장된 음성을 찾을 수 없어요. 대화를 다시 편집해 주세요.'),
      ).toHaveLength(1),
    )
    fireEvent.click(screen.getByRole('button', {name: '캐릭터로 듣기'}))
    expect(missingAudioEvents.playDialogue).toHaveBeenCalledWith(DIALOGUE.id)
    expect(onRequestClose).toHaveBeenCalledOnce()
  })

  it('should report when stored audio resolves before a player can be captured', async () => {
    const actual: typeof import('solid-js') = await vi.importActual('solid-js')
    vi.mocked(createSignal).mockImplementation(((initialValue?: unknown) =>
      initialValue === undefined
        ? [() => undefined, vi.fn()]
        : actual.createSignal(initialValue)) as typeof createSignal)
    const events = createEvents({getAudio: vi.fn(async () => new Blob(['audio']))})
    vi.mocked(usePEvents).mockReturnValue(events)
    render(() => <PDialogueSettingsContent />)

    fireEvent.click(screen.getByRole('button', {name: '듣기'}))

    await vi.waitFor(() =>
      expect(screen.getAllByText('음성 재생기를 준비하지 못했어요.')).toHaveLength(1),
    )
    vi.mocked(createSignal).mockImplementation(actual.createSignal)
  })

  it('should start and stop playable audio and report playback failures', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:dialogue')
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const events = createEvents({getAudio: vi.fn(async () => new Blob(['audio']))})
    vi.mocked(usePEvents).mockReturnValue(events)
    render(() => <PDialogueSettingsContent />)

    fireEvent.click(screen.getByRole('button', {name: '듣기'}))
    await vi.waitFor(() => expect(play).toHaveBeenCalledOnce())
    expect(createUrl).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', {name: '듣기'}))
    expect(revokeUrl).toHaveBeenCalledWith('blob:dialogue')
  })

  it('should report rejected browser playback and character playback failures', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:failed-dialogue')
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('playback'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const events = createEvents({
      getAudio: vi.fn(async () => new Blob(['audio'])),
      playDialogue: vi.fn(async () => {
        throw new Error('character')
      }),
    })
    vi.mocked(usePEvents).mockReturnValue(events)
    render(() => <PDialogueSettingsContent />)

    fireEvent.click(screen.getByRole('button', {name: '듣기'}))
    await vi.waitFor(() => expect(screen.getAllByText('음성을 재생하지 못했어요.')).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', {name: '캐릭터로 듣기'}))
    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'Failed to play saved dialogue through the character.',
        expect.any(Error),
      ),
    )
  })

  it('should ignore superseded audio requests whether they resolve or reject', async () => {
    let resolveFirst: (audio: Blob) => void = () => undefined
    const firstAudio = new Promise<Blob>((resolve) => {
      resolveFirst = resolve
    })
    const events = createEvents({
      getAudio: vi
        .fn()
        .mockImplementationOnce(() => firstAudio)
        .mockResolvedValueOnce(null),
    })
    vi.mocked(usePEvents).mockReturnValue(events)
    render(() => <PDialogueSettingsContent />)

    fireEvent.click(screen.getByRole('button', {name: '듣기'}))
    fireEvent.click(screen.getByRole('button', {name: '듣기'}))
    resolveFirst(new Blob(['late audio']))
    await vi.waitFor(() => expect(events.getAudio).toHaveBeenCalledTimes(2))
  })

  it('should ignore a rejected request after a newer request starts', async () => {
    let rejectFirst: (reason: Error) => void = () => undefined
    const firstAudio = new Promise<Blob>((_resolve, reject) => {
      rejectFirst = reject
    })
    const events = createEvents({
      getAudio: vi
        .fn()
        .mockImplementationOnce(() => firstAudio)
        .mockResolvedValueOnce(null),
    })
    vi.mocked(usePEvents).mockReturnValue(events)
    render(() => <PDialogueSettingsContent />)

    fireEvent.click(screen.getByRole('button', {name: '듣기'}))
    fireEvent.click(screen.getByRole('button', {name: '듣기'}))
    rejectFirst(new Error('late rejection'))
    await vi.waitFor(() => expect(events.getAudio).toHaveBeenCalledTimes(2))
  })

  it('should report failed event changes and dialogue deletion', async () => {
    const second = {...DIALOGUE, id: 'second-dialogue'} satisfies PDialogue
    const events = createEvents({
      deleteDialogue: vi.fn(async () => {
        throw new Error('delete')
      }),
      dialogues: () => [DIALOGUE, second],
      eventDialogueIds: () => ({'focus-start': [DIALOGUE.id, second.id]}),
      setEventDialogues: vi.fn(async () => {
        throw new Error('binding')
      }),
      setEventPlaybackMode: vi.fn(async () => {
        throw new Error('mode')
      }),
    })
    vi.mocked(usePEvents).mockReturnValue(events)
    render(() => <PDialogueSettingsContent />)

    fireEvent.click(screen.getByRole('button', {name: '입장 대화 연결'}))
    await vi.waitFor(() => expect(events.setEventDialogues).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', {name: '포모도르 집중 시작 재생 방식'}))
    await vi.waitFor(() => expect(events.setEventPlaybackMode).toHaveBeenCalledOnce())
    fireEvent.click(screen.getAllByRole('button', {name: '삭제'})[0]!)
    fireEvent.click(screen.getByRole('button', {name: '삭제 확인'}))
    await vi.waitFor(() => expect(screen.getAllByText('대화를 삭제하지 못했어요.')).toHaveLength(1))
  })

  it('should render an empty dialogue library after loading finishes', () => {
    vi.mocked(usePEvents).mockReturnValue(createEvents({dialogues: () => []}))
    render(() => <PDialogueSettingsContent />)

    expect(
      screen.getByText('아직 저장된 대화가 없어요. 새 대화를 만들어 보세요.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '입장 대화 연결'})).toBeDisabled()
  })
})
