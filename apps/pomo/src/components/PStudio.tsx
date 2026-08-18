import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, type JSX, onCleanup, onMount, Show} from 'solid-js'

import smilingFaceSource from './assets/pomodoro-status-icons/break.webp'
import {PButton} from '../design-system/PButton'
import {PIconButton} from '../design-system/PIconButton'
import {PIconSelect} from '../design-system/PIconSelect'
import type {PTrack} from '../features/focus-room-audio'
import {usePEvents} from '../features/focus-room-dialogue/PEventContext'
import {readFocusRoomEntrySession, writeFocusRoomEntrySession} from '../features/focus-room-entry'
import {
  getPScene,
  type PSceneId,
  type PSceneMotionInput,
  type PSceneMotionMode,
  supportsPSceneGyroscope,
} from '../features/focus-room-animation'
import {
  getAutomaticScenePeriod,
  getNextTimeMode,
  resolveScenePeriod,
  type ScenePeriod,
  type SceneTimeMode,
} from '../features/focus-room-time'
import {type PSayController, usePSay} from '../features/pomo-webmcp'
import {type ScreenSaverDelay, useScreenSaver} from '../features/screen-saver'
import {PMusicPlayer} from './PMusicPlayer'
import {PFeedStatus} from './PFeedStatus'
import {PDialoguePlayer} from './PDialoguePlayer'
import {PPomodoro, type PPomodoroPresentation} from './PPomodoro'
import {
  FOCUS_ROOM_ACTIVITY_OPTIONS,
  FOCUS_ROOM_GAZE_OPTIONS,
  FOCUS_ROOM_TIME_OPTIONS,
  type PActivity,
  type PGaze,
  resolvePSceneViseme,
} from './pomo-scene-options'
import {PScreenSaver} from './PScreenSaver'
import {useDialogueSceneGaze} from './use-dialogue-scene-gaze'

const CLASSES = {
  entry: [
    'pomo-entry absolute inset-0 flex items-end',
    'text-[#fff9f1]',
    '[&[data-exiting]]:animate-entry-reveal-room',
    '[&[data-exiting]]:pointer-events-none',
    'motion-reduce:[&[data-exiting]]:[animation-duration:1ms]',
  ].join(' '),
  entryAction: [
    'pomo-entry__action [button&]:min-w-[min(17rem,_100%)] [button&]:min-h-14',
    '[button&]:[padding-inline:1.5rem] [button&]:text-[0.9375rem]',
  ].join(' '),
  entryContent: [
    'pomo-entry__content flex w-[min(calc(100%_-_2rem_-_env(safe-area-inset-left)),_22rem)]',
    'box-border flex-col items-start gap-4',
    '[margin-block-end:calc(1.5rem_+_env(safe-area-inset-bottom))]',
    '[margin-inline-start:calc(1rem_+_env(safe-area-inset-left))]',
    'min-[40rem]:[margin-block-end:calc(2.5rem_+_env(safe-area-inset-bottom))]',
    'min-[40rem]:[margin-inline-start:calc(2.5rem_+_env(safe-area-inset-left))]',
  ].join(' '),
  entryLeadingImage: [
    'size-16 [margin-block:-1.25rem] [margin-inline-start:-0.75rem]',
    '[filter:drop-shadow(0_0.125rem_0.1875rem_rgb(0_0_0_/_32%))]',
  ].join(' '),
  loading: [
    'pomo-loading flex h-control-sm box-border items-center gap-2',
    'rounded-control bg-surface py-0 px-3',
    'text-foreground text-xs font-[650] leading-4 shadow-panel',
  ].join(' '),
  loadingSpinner: [
    'pomo-loading__spinner w-4 h-4 box-border flex-none',
    'animate-spin [border:2px_solid_rgb(255_255_255_/_28%)]',
    'border-t-highlight rounded-control',
    'motion-reduce:animate-[none]',
  ].join(' '),
  mediaDock: [
    'pomo-media-dock [--pomo-player-compact-width:7.75rem] absolute h-media-dock',
    'right-safe-right bottom-safe-bottom left-safe-left flex',
    'flex-col items-start justify-end pointer-events-none gap-3',
    '[&_.pomo-player-stage]:relative [&_.pomo-player-stage]:inset-[auto]',
    '[&_.pomo-player-stage]:w-[min(29rem,_100%)] [&_.pomo-player-stage]:flex-none',
    '[&_.pomo-player-stage]:pointer-events-auto',
    '[&_.pomo-player-stage]:transition-[width_180ms_ease] [&_.pomo-dialogue-bubble]:w-full',
    '[&_.pomo-dialogue-bubble]:max-h-full [&_.pomo-dialogue-bubble]:[flex:0_1_auto]',
    '[&_.pomo-dialogue-bubble]:pointer-events-auto',
    '[&[data-dialogue-active]:not([data-player-expanded])_.pomo-player-stage]:w-[var(--pomo-player-compact-width)]',
    '[&[data-dialogue-active]:not([data-player-expanded])_[data-pomo-player-title]]:hidden',
    'min-[40rem]:right-safe-right-wide min-[40rem]:bottom-safe-bottom-wide',
    'min-[40rem]:left-safe-left-wide min-[40rem]:h-media-dock-wide',
    'motion-reduce:[&_.pomo-player-stage]:transition-[none]',
  ].join(' '),
  mediaMessages: [
    'pomo-media-messages flex w-[min(36rem,_100%)] min-h-0 max-h-full [flex:0_1_auto] flex-col',
    'gap-3 overflow-hidden pointer-events-none [&_>_*]:pointer-events-auto',
  ].join(' '),
  sceneControl: [
    'pomo-scene-control max-[40rem]:[&.pomo-icon-button]:hidden',
    'max-[40rem]:[&.pomo-icon-select]:hidden',
  ].join(' '),
  ui: 'pomo-ui pointer-events-none absolute inset-0',
} as const

const ENTRY_STYLE: JSX.CSSProperties = {
  background: [
    'radial-gradient(ellipse 125% 105% at 0% 108%, ',
    'rgb(7 5 4 / 94%) 0%, rgb(7 5 4 / 82%) 28%, ',
    'rgb(7 5 4 / 58%) 54%, rgb(7 5 4 / 30%) 74%, transparent 92%)',
  ].join(''),
}

const PSceneCanvas = clientOnly(() => import('./PSceneCanvas'), {
  lazy: true,
})
const PSettings = clientOnly(() => import('./PSettings'), {lazy: true})
const AUTOMATIC_PERIOD_REFRESH = 60_000
const INITIAL_POMODORO_PRESENTATION = {
  phaseLabel: '집중',
  statusLabel: '집중 준비',
  timeLabel: '25:00',
} satisfies PPomodoroPresentation

type SceneTime = ScenePeriod

interface SceneAsset {
  readonly depthSource: string
  readonly id: PSceneId
  readonly label: string
  readonly source: string
}

interface SceneToolbarProps {
  readonly activity: PActivity
  readonly canUseGyroscope?: boolean
  readonly gaze: PGaze
  readonly isSceneTransitioning: boolean
  readonly onActivityChange: (activity: PActivity) => void
  readonly onGazeChange: (gaze: PGaze) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
  readonly onMotionModeChange: (motionMode: PSceneMotionMode) => void
  readonly onScreenSaverDelayChange: (delay: ScreenSaverDelay) => void
  readonly onTimeModeChange: (mode: SceneTimeMode) => void
  readonly screenSaverDelay: ScreenSaverDelay
  readonly motionInput?: PSceneMotionInput
  readonly motionMode: PSceneMotionMode
  readonly time: SceneTime
  readonly timeMode: SceneTimeMode
}

interface PEntryProps {
  readonly isExiting: boolean
  readonly onEnter: () => void
  readonly onExitComplete: () => void
}

interface PSceneFallbackProps {
  readonly source: string
}

interface PStudioEventsProps {
  readonly isPlayerExpanded: boolean
  readonly onPlayerExpandedChange: (isExpanded: boolean) => void
  readonly onPomodoroPresentationChange: (presentation: PPomodoroPresentation) => void
  readonly onTrackChange: (track: PTrack | null) => void
  readonly pomoSay: PSayController
}

const findLabel = <TValue extends string>(
  options: readonly {readonly label: string; readonly value: TValue}[],
  value: TValue,
) => options.find((option) => option.value === value)?.label ?? value

const getSceneAsset = (time: SceneTime, activity: PActivity, gaze: PGaze): SceneAsset => {
  const timeLabel = findLabel(FOCUS_ROOM_TIME_OPTIONS, time)
  const activityLabel = findLabel(FOCUS_ROOM_ACTIVITY_OPTIONS, activity)
  const gazeLabel = findLabel(FOCUS_ROOM_GAZE_OPTIONS, gaze)
  const scene = getPScene(time, activity, gaze)

  return {
    depthSource: scene.depthSource,
    id: scene.id,
    label: `${timeLabel} · ${activityLabel} · ${gazeLabel}`,
    source: scene.source,
  }
}

const SceneToolbar = (props: SceneToolbarProps) => {
  const timeModeOption = () =>
    FOCUS_ROOM_TIME_OPTIONS.find((option) => option.value === props.timeMode) ??
    FOCUS_ROOM_TIME_OPTIONS[0]
  const timeAccessibleLabel = () => {
    const option = timeModeOption()

    return option.value === 'auto'
      ? `시간대 자동, 현재 ${findLabel(FOCUS_ROOM_TIME_OPTIONS, props.time)}`
      : `시간대 ${option.label}`
  }

  return (
    <div
      class={cx(
        'pointer-events-auto absolute right-4 top-[calc(1rem+env(safe-area-inset-top))]',
        'flex flex-col items-end gap-2',
        'sm:right-7 sm:top-6',
      )}
    >
      <div class="flex flex-wrap justify-end gap-2" role="group" aria-label="장면 설정">
        <PIconButton
          accessibleLabel={timeAccessibleLabel()}
          class={CLASSES.sceneControl}
          feedback={timeModeOption().label}
          icon={timeModeOption().icon}
          onPress={() => props.onTimeModeChange(getNextTimeMode(props.timeMode))}
        />
        <PIconSelect
          class={CLASSES.sceneControl}
          label="행동"
          onChange={props.onActivityChange}
          options={FOCUS_ROOM_ACTIVITY_OPTIONS}
          value={props.activity}
        />
        <PIconSelect
          class={CLASSES.sceneControl}
          label="보기"
          onChange={props.onGazeChange}
          options={FOCUS_ROOM_GAZE_OPTIONS}
          value={props.gaze}
        />
        <PSettings
          activity={props.activity}
          canUseGyroscope={props.canUseGyroscope}
          gaze={props.gaze}
          onActivityChange={props.onActivityChange}
          onGazeChange={props.onGazeChange}
          onMotionInputChange={props.onMotionInputChange}
          onMotionModeChange={props.onMotionModeChange}
          onScreenSaverDelayChange={props.onScreenSaverDelayChange}
          onTimeModeChange={props.onTimeModeChange}
          screenSaverDelay={props.screenSaverDelay}
          motionInput={props.motionInput}
          motionMode={props.motionMode}
          timeMode={props.timeMode}
          fallback={
            <span
              aria-hidden="true"
              class={cx(
                'inline-flex h-control-md min-w-control-md items-center justify-center rounded-control',
                'border border-solid border-border bg-surface text-foreground shadow-panel',
              )}
            >
              <span class="i-tabler-settings size-5 text-highlight" />
            </span>
          }
        />
      </div>
      <Show when={props.isSceneTransitioning}>
        <span
          aria-live="polite"
          class={cx('border border-solid border-border backdrop-blur-surface', CLASSES.loading)}
          role="status"
        >
          <span aria-hidden="true" class={CLASSES.loadingSpinner} />
          장면 전환 중
        </span>
      </Show>
    </div>
  )
}

const PEntry = (props: PEntryProps) => (
  <section
    aria-label="Pomo 시작"
    class={CLASSES.entry}
    data-exiting={props.isExiting ? '' : undefined}
    style={ENTRY_STYLE}
    onAnimationEnd={(event) => {
      if (event.target === event.currentTarget) {
        props.onExitComplete()
      }
    }}
  >
    <div class={CLASSES.entryContent}>
      <PButton
        class={CLASSES.entryAction}
        disabled={props.isExiting}
        leadingImage={smilingFaceSource}
        leadingImageClass={CLASSES.entryLeadingImage}
        onPress={() => props.onEnter()}
        tone="primary"
        trailingIcon="i-tabler-arrow-right"
      >
        포모와 시작하기
      </PButton>
    </div>
  </section>
)

const PSceneFallback = (props: PSceneFallbackProps) => (
  <img
    alt=""
    aria-hidden="true"
    class="absolute inset-0 h-full w-full object-cover"
    decoding="async"
    fetchpriority="high"
    src={props.source}
  />
)

const PStudioEvents = (props: PStudioEventsProps) => {
  const events = usePEvents()
  const handlePomodoroEvents = (eventIds: Parameters<typeof events.playDialogueEvents>[0]) => {
    events.playDialogueEvents(eventIds, props.pomoSay.stop).catch((error: unknown) => {
      console.error('Unexpected pomodoro dialogue playback failure.', error)
    })
  }

  return (
    <>
      <PPomodoro
        onEvents={handlePomodoroEvents}
        onPresentationChange={props.onPomodoroPresentationChange}
      />
      <div
        class={CLASSES.mediaDock}
        data-dialogue-active={
          events.activeText() === null &&
          props.pomoSay.speechText() === null &&
          !events.isDialoguePlaybackBlocked() &&
          events.scheduledDialogueCount() === 0
            ? undefined
            : ''
        }
        data-player-expanded={props.isPlayerExpanded ? '' : undefined}
      >
        <PMusicPlayer
          expanded={props.isPlayerExpanded}
          onExpandedChange={props.onPlayerExpandedChange}
          onTrackChange={props.onTrackChange}
        />
        <div class={CLASSES.mediaMessages}>
          <PFeedStatus />
          <PDialoguePlayer
            externalText={props.pomoSay.speechText()}
            onStopExternalSpeech={props.pomoSay.stop}
          />
        </div>
      </div>
    </>
  )
}

export const PStudio = () => {
  const events = usePEvents()
  const pomoSay = usePSay({onBeforeSpeech: events.onStopDialoguePlayback})
  const [timeMode, setTimeMode] = createSignal<SceneTimeMode>('day')
  const [automaticPeriod, setAutomaticPeriod] = createSignal<ScenePeriod>('day')
  const [activity, setActivity] = createSignal<PActivity>('reading')
  const [gaze, setGaze] = createSignal<PGaze>('focused')
  const [motionInput, setMotionInput] = createSignal<PSceneMotionInput>('drag')
  const [motionMode, setMotionMode] = createSignal<PSceneMotionMode>('depth')
  const [canUseGyroscope, setCanUseGyroscope] = createSignal(false)
  const [isSceneLoading, setIsSceneLoading] = createSignal(true)
  const [hasSceneRendered, setHasSceneRendered] = createSignal(false)
  const [isPlayerExpanded, setIsPlayerExpanded] = createSignal(false)
  const hasEntered = events.hasEnteredFocusRoom
  const [isEntryVisible, setIsEntryVisible] = createSignal(false)
  const [currentTrack, setCurrentTrack] = createSignal<PTrack | null>(null)
  const [pomodoroPresentation, setPomodoroPresentation] = createSignal<PPomodoroPresentation>(
    INITIAL_POMODORO_PRESENTATION,
  )
  const screenSaver = useScreenSaver()
  const time = createMemo(() => resolveScenePeriod(timeMode(), automaticPeriod()))
  const sceneGaze = useDialogueSceneGaze(gaze, events.isDialoguePlaying, pomoSay.isPlaying)
  const selectedScene = createMemo(() => getSceneAsset(time(), activity(), sceneGaze()))
  const activeViseme = createMemo(() => {
    return resolvePSceneViseme(
      events.activeViseme(),
      events.isDialoguePlaying(),
      pomoSay.speechText(),
      pomoSay.activeViseme(),
    )
  })
  const handleLoadingChange = (isLoading: boolean) => {
    setIsSceneLoading(isLoading)

    if (!isLoading) {
      setHasSceneRendered(true)
    }
  }
  const handleEnter = () => {
    writeFocusRoomEntrySession()

    if (hasEntered()) {
      return
    }

    events.enterFocusRoom()
  }

  onMount(() => {
    const gyroscopeAvailable = supportsPSceneGyroscope()
    const updateAutomaticPeriod = () => setAutomaticPeriod(getAutomaticScenePeriod(new Date()))
    const timer = window.setInterval(updateAutomaticPeriod, AUTOMATIC_PERIOD_REFRESH)

    if (hasEntered() || readFocusRoomEntrySession()) {
      events.enterFocusRoom()
    } else {
      setIsEntryVisible(true)
    }

    setCanUseGyroscope(gyroscopeAvailable)
    if (gyroscopeAvailable) {
      setMotionInput('gyroscope')
    }

    updateAutomaticPeriod()
    onCleanup(() => window.clearInterval(timer))
  })

  return (
    <section aria-label="Pomo" class="relative h-dvh w-full overflow-hidden">
      <figure
        aria-label={selectedScene().label}
        class="relative m-0 h-full w-full overflow-hidden bg-#17130f"
        role="img"
      >
        <Show when={!hasSceneRendered()}>
          <PSceneFallback source={selectedScene().source} />
        </Show>
        <PSceneCanvas
          activity={activity()}
          depthSource={selectedScene().depthSource}
          gaze={sceneGaze()}
          motionInput={motionInput()}
          motionMode={motionMode()}
          onLoadingChange={handleLoadingChange}
          onMotionInputChange={setMotionInput}
          source={selectedScene().source}
          sceneId={selectedScene().id}
          time={time()}
          viseme={activeViseme()}
        />

        <Show when={hasEntered() && isSceneLoading() && !hasSceneRendered()}>
          <div
            aria-live="polite"
            class="pointer-events-none absolute inset-0 grid place-items-center bg-#17130f/24"
            role="status"
          >
            <span
              class={cx('border border-solid border-border backdrop-blur-surface', CLASSES.loading)}
            >
              <span aria-hidden="true" class={CLASSES.loadingSpinner} />
              장면을 불러오는 중
            </span>
          </div>
        </Show>
      </figure>

      <div class={CLASSES.ui} hidden={!hasEntered()}>
        <Show when={hasEntered()}>
          <PStudioEvents
            isPlayerExpanded={isPlayerExpanded()}
            onPlayerExpandedChange={setIsPlayerExpanded}
            onPomodoroPresentationChange={setPomodoroPresentation}
            onTrackChange={setCurrentTrack}
            pomoSay={pomoSay}
          />
          <SceneToolbar
            activity={activity()}
            canUseGyroscope={canUseGyroscope()}
            gaze={sceneGaze()}
            isSceneTransitioning={isSceneLoading() && hasSceneRendered()}
            onActivityChange={setActivity}
            onGazeChange={setGaze}
            onMotionInputChange={setMotionInput}
            onMotionModeChange={setMotionMode}
            onScreenSaverDelayChange={screenSaver.onDelayChange}
            onTimeModeChange={setTimeMode}
            screenSaverDelay={screenSaver.delay()}
            motionInput={motionInput()}
            motionMode={motionMode()}
            time={time()}
            timeMode={timeMode()}
          />
        </Show>
      </div>
      <Show when={isEntryVisible()}>
        <PEntry
          isExiting={hasEntered()}
          onEnter={handleEnter}
          onExitComplete={() => setIsEntryVisible(false)}
        />
      </Show>
      <PScreenSaver
        isActive={hasEntered() && screenSaver.isActive()}
        onDismiss={screenSaver.onDismiss}
        timer={{
          status: pomodoroPresentation().statusLabel,
          time: pomodoroPresentation().timeLabel,
        }}
        track={currentTrack()}
      />
    </section>
  )
}
