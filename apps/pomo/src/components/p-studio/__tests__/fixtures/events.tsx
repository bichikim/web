/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {onCleanup, onMount} from 'solid-js'
import {vi} from 'vitest'
import type {PTrack} from '../../../../features/focus-room-audio'
import {
  RANDOM_DIALOGUE_EVENT,
  usePEvents,
  useRandomEvent,
} from '../../../../features/focus-room-dialogue'
import {useOptionalSoundEffects} from '../../../../features/sound-effects'

import {useMemoryReminders} from '../../../../features/memory-assist'
import type {PSayController} from '../../../../features/pomo-webmcp'
import {PStudioEvents} from '../../Events'
import {useChildPresence} from '../../use-child-presence'
import {useMobileLayout} from '../../use-mobile-layout'
import {useOneOffChat} from '../../use-one-off-chat'

const serverJobMocks = vi.hoisted(() => ({
  accessMessage: vi.fn((): string | null => null),
  accessStatus: vi.fn(() => 'unavailable' as const),
  actionMessage: vi.fn((): string | null => null),
  artifactDeleted: vi.fn(() => false),
  cancel: vi.fn(async () => false),
  deleteArtifact: vi.fn(async () => false),
  errorMessage: vi.fn((): string | null => null),
  executionMode: vi.fn(() => 'local' as const),
  isBusy: vi.fn(() => false),
  isCancelling: vi.fn(() => false),
  isDeleting: vi.fn(() => false),
  isRefreshingResult: vi.fn(() => false),
  isSaving: vi.fn(() => false),
  job: vi.fn(() => null),
  jobResult: vi.fn(() => null),
  jobStatus: vi.fn(() => 'idle' as const),
  refresh: vi.fn(async () => false),
  refreshResult: vi.fn(async () => false),
  retry: vi.fn(async () => false),
  saveArtifact: vi.fn(async () => false),
  serverAvailable: vi.fn(() => false),
  setExecutionMode: vi.fn(),
  speakResult: vi.fn(async () => false),
  statusMessage: vi.fn((): string | null => null),
  submit: vi.fn(async () => false),
}))
const oneOffChatMocks = vi.hoisted(() => ({
  cancelDownloadConsent: vi.fn(),
  downloadConsentOpen: vi.fn(() => false),
  draft: vi.fn(() => ''),
  errorMessage: vi.fn((): string | null => null),
  isBusy: vi.fn(() => false),
  serverJob: serverJobMocks,
  setDraft: vi.fn(),
  startDownload: vi.fn(async () => undefined),
  submit: vi.fn(async () => undefined),
}))
const musicPlaybackMocks = vi.hoisted(() => ({
  pause: vi.fn(),
  play: vi.fn(),
}))
const musicPlayerLifecycleMocks = vi.hoisted(() => ({actionsReady: true}))
const soundEffectsMocks = vi.hoisted(() => ({
  activate: vi.fn(),
  stop: vi.fn(),
}))

vi.mock('../../../../features/focus-room-dialogue', () => ({
  RANDOM_DIALOGUE_EVENT: 'random-event',
  usePEvents: vi.fn(),
  useRandomEvent: vi.fn(),
}))
vi.mock('../../../../features/memory-assist', () => ({
  useMemoryReminders: vi.fn(() => ({skippedReminders: () => []})),
}))
vi.mock('../../../../features/sound-effects', () => ({useOptionalSoundEffects: vi.fn()}))
vi.mock('../../use-one-off-chat', () => ({
  ONE_OFF_CHAT_MODEL: {downloadSize: '3.7GB'},
  useOneOffChat: vi.fn(() => oneOffChatMocks),
}))
vi.mock('../../use-mobile-layout', () => ({
  useMobileLayout: vi.fn(() => false),
}))
vi.mock('../../use-child-presence', () => ({
  useChildPresence: vi.fn(() => () => false),
}))
vi.mock('../../../p-dialogue-composer/PDialogueComposer', () => ({
  PDialogueComposer: (props: {
    readonly autoExpand?: boolean
    readonly draft?: () => string
    readonly loading?: boolean
    readonly onDraftChange?: (text: string) => void
    readonly onSubmit?: (text: string) => void
  }) => (
    <form class="pomo-dialogue-composer" data-auto-expand={props.autoExpand ? '' : undefined}>
      <input
        aria-label="대화 입력"
        onInput={(event) => props.onDraftChange?.(event.currentTarget.value)}
        value={props.draft?.() ?? ''}
      />
      <button disabled={props.loading} onClick={() => props.onSubmit?.('집중 방법')} type="button">
        대화 보내기
      </button>
    </form>
  ),
}))
vi.mock('../../../p-model-download-consent/PModelDownloadConsent', () => ({
  PModelDownloadConsent: () => null,
}))
vi.mock('../../../p-dialogue-player/PDialoguePlayer', () => ({
  PDialoguePlayer: (props: {
    readonly externalText: string | null
    readonly onStopExternalSpeech: () => void
    readonly sceneStyle: string
  }) => (
    <div data-dialogue-scene={props.sceneStyle} data-external-text={props.externalText ?? ''}>
      <button onClick={() => props.onStopExternalSpeech?.()} type="button">
        외부 발화 중지
      </button>
    </div>
  ),
}))
vi.mock('../../../p-feed-status/PFeedStatus', () => ({
  PFeedStatus: (props: {readonly sceneStyle: string}) => <div data-feed-scene={props.sceneStyle} />,
}))
vi.mock('../../../p-music-player/PMusicPlayer', () => ({
  PMusicPlayer: (props: {
    readonly expanded: boolean
    readonly isDialogueActive: boolean
    readonly onExpandedChange: (expanded: boolean) => void
    readonly onPlaybackActionsReady?: (
      actions: {
        readonly pause: () => void
        readonly play: () => void
      } | null,
    ) => void
    readonly onPlayingChange: (playing: boolean) => void
    readonly onTrackChange: (track: PTrack | null) => void
    readonly sceneStyle: string
  }) => {
    onMount(() => {
      if (musicPlayerLifecycleMocks.actionsReady) {
        props.onPlaybackActionsReady?.(musicPlaybackMocks)
      }
    })
    onCleanup(() => props.onPlaybackActionsReady?.(null))
    return (
      <div
        data-music-dialogue-active={props.isDialogueActive}
        data-expanded={props.expanded}
        data-music-scene={props.sceneStyle}
      >
        <button onClick={() => props.onPlayingChange(true)} type="button">
          음악 재생
        </button>
        <button onClick={() => props.onExpandedChange(true)} type="button">
          플레이어 펼치기
        </button>
        <button onClick={() => props.onTrackChange(null)} type="button">
          트랙 지우기
        </button>
      </div>
    )
  },
}))
vi.mock('../../../p-pomodoro/PPomodoro', () => ({
  PPomodoro: (props: {
    readonly onEvents: (
      eventIds: ReadonlyArray<string>,
      options?: {readonly isCatchUp: true},
    ) => void
    readonly onPresentationChange: (presentation: {
      readonly phaseLabel: string
      readonly statusLabel: string
      readonly timeLabel: string
    }) => void
    readonly sceneStyle: string
  }) => (
    <div data-pomodoro-scene={props.sceneStyle}>
      <button onClick={() => props.onEvents(['focus-start'])} type="button">
        집중 시작 이벤트
      </button>
      <button onClick={() => props.onEvents(['focus-end'], {isCatchUp: true})} type="button">
        복원 이벤트
      </button>
      <button
        onClick={() =>
          props.onPresentationChange({
            phaseLabel: '집중',
            statusLabel: '진행 중',
            timeLabel: '25:00',
          })
        }
        type="button"
      >
        타이머 표시 갱신
      </button>
    </div>
  ),
}))

const createEvents = (
  overrides: {
    readonly activeText?: string | null
    readonly blocked?: boolean
    readonly isPlaying?: boolean
    readonly registerBeforePlayback?: (callback: () => void) => () => void
    readonly registerEventActionExecutor?: (
      executor: (
        actionId: 'music-start' | 'music-stop' | 'sound-effects-start' | 'sound-effects-stop',
      ) => void,
    ) => () => void
    readonly scheduledCount?: number
    readonly playDialogueEvents?: ReturnType<typeof vi.fn>
  } = {},
) =>
  ({
    activeText: () => overrides.activeText ?? null,
    isDialoguePlaybackBlocked: () => overrides.blocked ?? false,
    isDialoguePlaying: () => overrides.isPlaying ?? false,
    playDialogueEvents: overrides.playDialogueEvents ?? vi.fn(async () => undefined),
    registerBeforePlayback: overrides.registerBeforePlayback ?? vi.fn(() => vi.fn()),
    registerEventActionExecutor: overrides.registerEventActionExecutor ?? vi.fn(() => vi.fn()),
    scheduledDialogueCount: () => overrides.scheduledCount ?? 0,
  }) as unknown as ReturnType<typeof usePEvents>

const createPomoSay = (speechText: string | null = null, isPreparing = false): PSayController => ({
  activeViseme: () => 'rest',
  isPlaying: () => false,
  isPreparing: () => isPreparing,
  speak: vi.fn(async () => undefined),
  speechText: () => speechText,
  stop: vi.fn(),
})

const renderEvents = (
  options: {
    readonly dialogueComposerVisible?: boolean
    readonly events?: ReturnType<typeof createEvents>
    readonly expanded?: boolean
    readonly pomoSay?: PSayController
    readonly onMusicPlayingChange?: (isPlaying: boolean) => void
    readonly onPlayerExpandedChange?: (isExpanded: boolean) => void
    readonly onPomodoroPresentationChange?: (presentation: {
      readonly phaseLabel: string
      readonly statusLabel: string
      readonly timeLabel: string
    }) => void
    readonly onTrackChange?: (track: PTrack | null) => void
  } = {},
) => {
  vi.mocked(usePEvents).mockReturnValue(options.events ?? createEvents())

  return render(() => (
    <PStudioEvents
      dialogueComposerVisible={options.dialogueComposerVisible ?? true}
      isPlayerExpanded={options.expanded ?? false}
      onMusicPlayingChange={options.onMusicPlayingChange ?? vi.fn()}
      onPlayerExpandedChange={options.onPlayerExpandedChange ?? vi.fn()}
      onPomodoroPresentationChange={options.onPomodoroPresentationChange ?? vi.fn()}
      onTrackChange={options.onTrackChange ?? vi.fn()}
      pomoSay={options.pomoSay ?? createPomoSay()}
      sceneStyle="original"
    />
  ))
}

export {
  createEvents,
  createPomoSay,
  renderEvents,
  oneOffChatMocks,
  musicPlaybackMocks,
  soundEffectsMocks,
}

vi.mock('src/features/ai-job/release', () => ({SERVER_AI_RELEASED: true}))

export {musicPlayerLifecycleMocks}
