import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, onCleanup, onMount, Show} from 'solid-js'

import brandMarkSource from '../../assets/brand/pomo-orange-hairpin-brand-mark.webp'
import smilingFaceSource from '../../assets/pomodoro-status-icons/break-face.webp'
import {PButton} from '../design-system/PButton'
import {PIconButton} from '../design-system/PIconButton'
import {PIconSelect} from '../design-system/PIconSelect'
import type {PTrack} from '../features/focus-room-audio/focus-room-playlist'
import {PEventProvider, usePEvents} from '../features/focus-room-dialogue/PEventContext'
import {PFeedProvider} from '../features/focus-room-feed'
import {
  getAutomaticScenePeriod,
  getNextTimeMode,
  resolveScenePeriod,
  type ScenePeriod,
  type SceneTimeMode,
} from '../features/focus-room-time'
import {usePSay} from '../features/pomo-webmcp'
import {type ScreenSaverDelay, useScreenSaver} from '../features/screen-saver'
import type {PixiLayerSceneDefinition} from '../features/focus-room-animation/layer-scene'
import {getPScene} from '../features/focus-room-animation/scene-catalog'
import {
  type PSceneMotionInput,
  type PSceneMotionMode,
  supportsPSceneGyroscope,
} from '../features/focus-room-animation/scene-motion'
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
  readonly onEnter: () => void
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
        'absolute right-4 top-[calc(1rem+env(safe-area-inset-top))]',
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
  <section aria-label="Pomo 집중룸 입장" class="pomo-entry">
    <div class="pomo-entry__content">
      <div class="pomo-entry__mark-stage">
        <img
          alt="Pomo의 주황 사각 핀"
          class="pomo-entry__mark"
          decoding="async"
          fetchpriority="high"
          height="1254"
          src={brandMarkSource}
          width="1254"
        />
      </div>
      <PButton
        class="pomo-entry__action"
        leadingImage={smilingFaceSource}
        onPress={() => props.onEnter()}
        tone="glass"
        trailingIcon="i-tabler-arrow-right"
      >
        입장하기
      </PButton>
    </div>
  </section>
)

const PStudioContent = () => {
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
  const [hasEntered, setHasEntered] = createSignal(false)
  const [currentTrack, setCurrentTrack] = createSignal<PTrack | null>(null)
  const [pomodoroPresentation, setPomodoroPresentation] = createSignal<PPomodoroPresentation>(
    INITIAL_POMODORO_PRESENTATION,
  )
  const screenSaver = useScreenSaver()
  const pomoSay = usePSay({onBeforeSpeech: events.onStopDialoguePlayback})
  const time = createMemo(() => resolveScenePeriod(timeMode(), automaticPeriod()))
  const selectedScene = createMemo(() => getSceneAsset(time(), activity(), gaze()))
  const handleLoadingChange = (isLoading: boolean) => {
    setIsSceneLoading(isLoading)

    if (!isLoading) {
      setHasSceneRendered(true)
    }
  }
  const handlePomodoroEvents = (eventIds: Parameters<typeof events.playDialogueEvents>[0]) => {
    events.playDialogueEvents(eventIds, pomoSay.stop).catch((error: unknown) => {
      console.error('Unexpected pomodoro dialogue playback failure.', error)
    })
  }
  const handleEnter = () => setHasEntered(true)

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

        <Show when={isSceneLoading() && !hasSceneRendered()}>
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
        <PPomodoro onEvents={handlePomodoroEvents} onPresentationChange={setPomodoroPresentation} />
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
          data-player-expanded={isPlayerExpanded() ? '' : undefined}
        >
          <PMusicPlayer
            expanded={isPlayerExpanded()}
            onExpandedChange={setIsPlayerExpanded}
            onTrackChange={setCurrentTrack}
          />
          <div class="pomo-media-messages">
            <PFeedStatus />
            <PDialoguePlayer
              externalText={pomoSay.speechText()}
              onStopExternalSpeech={pomoSay.stop}
            />
          </div>
        </div>
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
      </div>
      <Show when={!hasEntered()}>
        <PEntry onEnter={handleEnter} />
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

export const PStudio = () => (
  <PEventProvider>
    <PFeedProvider>
      <PStudioContent />
    </PFeedProvider>
  </PEventProvider>
)
