import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'

import smilingFaceSource from 'assets/pomodoro-status-icons/break-face.webp'
import {PButton} from '../design-system/PButton'
import {PIconButton} from '../design-system/PIconButton'
import {PIconSelect} from '../design-system/PIconSelect'
import type {PTrack} from '../features/focus-room-audio'
import {usePEvents} from '../features/focus-room-dialogue/PEventContext'
import {
  getPScene,
  type PixiLayerSceneDefinition,
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
import {usePSay} from '../features/pomo-webmcp'
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
} from './pomo-scene-options'
import {PSettings} from './PSettings'
import {PScreenSaver} from './PScreenSaver'

const PSceneCanvas = clientOnly(() => import('./PSceneCanvas'), {
  lazy: true,
})
const AUTOMATIC_PERIOD_REFRESH = 60_000
const INITIAL_POMODORO_PRESENTATION = {
  phaseLabel: '집중',
  statusLabel: '집중 준비',
  timeLabel: '25:00',
} satisfies PPomodoroPresentation

type SceneTime = ScenePeriod

interface SceneAsset {
  readonly depthSource: string
  readonly label: string
  readonly layerScene: PixiLayerSceneDefinition | null
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
    label: `${timeLabel} · ${activityLabel} · ${gazeLabel}`,
    layerScene: scene.layerScene,
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
          class="pomo-scene-control"
          feedback={timeModeOption().label}
          icon={timeModeOption().icon}
          onPress={() => props.onTimeModeChange(getNextTimeMode(props.timeMode))}
        />
        <PIconSelect
          class="pomo-scene-control"
          label="행동"
          onChange={props.onActivityChange}
          options={FOCUS_ROOM_ACTIVITY_OPTIONS}
          value={props.activity}
        />
        <PIconSelect
          class="pomo-scene-control"
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
        />
      </div>
      <Show when={props.isSceneTransitioning}>
        <span aria-live="polite" class="pomo-backdrop pomo-loading" role="status">
          <span aria-hidden="true" class="pomo-loading__spinner" />
          장면 전환 중
        </span>
      </Show>
    </div>
  )
}

const PEntry = (props: PEntryProps) => (
  <section
    aria-label="Pomo 집중룸 입장"
    class="pomo-entry"
    data-exiting={props.isExiting ? '' : undefined}
    onAnimationEnd={(event) => {
      if (event.target === event.currentTarget) {
        props.onExitComplete()
      }
    }}
  >
    <div class="pomo-entry__content">
      <PButton
        class="pomo-entry__action"
        disabled={props.isExiting}
        leadingImage={smilingFaceSource}
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
  const pomoSay = usePSay({onBeforeSpeech: events.onStopDialoguePlayback})
  const handlePomodoroEvents = (eventIds: Parameters<typeof events.playDialogueEvents>[0]) => {
    events.playDialogueEvents(eventIds, pomoSay.stop).catch((error: unknown) => {
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
        class="pomo-media-dock"
        data-dialogue-active={
          events.activeText() === null &&
          pomoSay.speechText() === null &&
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
        <div class="pomo-media-messages">
          <PFeedStatus />
          <PDialoguePlayer
            externalText={pomoSay.speechText()}
            onStopExternalSpeech={pomoSay.stop}
          />
        </div>
      </div>
    </>
  )
}

export const PStudio = () => {
  const events = usePEvents()
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
  const [isEntryVisible, setIsEntryVisible] = createSignal(
    untrack(() => !events.hasEnteredFocusRoom()),
  )
  const [currentTrack, setCurrentTrack] = createSignal<PTrack | null>(null)
  const [pomodoroPresentation, setPomodoroPresentation] = createSignal<PPomodoroPresentation>(
    INITIAL_POMODORO_PRESENTATION,
  )
  const screenSaver = useScreenSaver()
  const time = createMemo(() => resolveScenePeriod(timeMode(), automaticPeriod()))
  const selectedScene = createMemo(() => getSceneAsset(time(), activity(), gaze()))
  const handleLoadingChange = (isLoading: boolean) => {
    setIsSceneLoading(isLoading)

    if (!isLoading) {
      setHasSceneRendered(true)
    }
  }
  const handleEnter = () => {
    if (hasEntered()) {
      return
    }

    events.enterFocusRoom()
  }

  onMount(() => {
    const gyroscopeAvailable = supportsPSceneGyroscope()
    const updateAutomaticPeriod = () => setAutomaticPeriod(getAutomaticScenePeriod(new Date()))
    const timer = window.setInterval(updateAutomaticPeriod, AUTOMATIC_PERIOD_REFRESH)

    setCanUseGyroscope(gyroscopeAvailable)
    if (gyroscopeAvailable) {
      setMotionInput('gyroscope')
    }

    updateAutomaticPeriod()
    onCleanup(() => window.clearInterval(timer))
  })

  return (
    <section aria-label="포커스 룸" class="relative h-dvh w-full overflow-hidden">
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
          gaze={gaze()}
          layerScene={selectedScene().layerScene}
          motionInput={motionInput()}
          motionMode={motionMode()}
          onLoadingChange={handleLoadingChange}
          onMotionInputChange={setMotionInput}
          source={selectedScene().source}
          time={time()}
        />

        <Show when={hasEntered() && isSceneLoading() && !hasSceneRendered()}>
          <div
            aria-live="polite"
            class="pointer-events-none absolute inset-0 grid place-items-center bg-#17130f/24"
            role="status"
          >
            <span class="pomo-backdrop pomo-loading">
              <span aria-hidden="true" class="pomo-loading__spinner" />
              장면을 불러오는 중
            </span>
          </div>
        </Show>
      </figure>

      <div class="pomo-ui" hidden={!hasEntered()}>
        <Show when={hasEntered()}>
          <PStudioEvents
            isPlayerExpanded={isPlayerExpanded()}
            onPlayerExpandedChange={setIsPlayerExpanded}
            onPomodoroPresentationChange={setPomodoroPresentation}
            onTrackChange={setCurrentTrack}
          />
          <SceneToolbar
            activity={activity()}
            canUseGyroscope={canUseGyroscope()}
            gaze={gaze()}
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
