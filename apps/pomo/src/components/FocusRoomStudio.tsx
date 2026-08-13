import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, onCleanup, onMount, Show} from 'solid-js'

import {FocusRoomIconButton} from '../design-system/FocusRoomIconButton'
import {FocusRoomIconSelect} from '../design-system/FocusRoomIconSelect'
import {
  FocusRoomEventProvider,
  useFocusRoomEvents,
} from '../features/focus-room-dialogue/FocusRoomEventContext'
import {
  getAutomaticScenePeriod,
  getNextTimeMode,
  resolveScenePeriod,
  type ScenePeriod,
  type SceneTimeMode,
} from '../features/focus-room-time'
import {usePomoSay} from '../features/pomo-webmcp'
import type {PixiLayerSceneDefinition} from '../features/focus-room-animation/layer-scene'
import {getFocusRoomScene} from '../features/focus-room-animation/scene-catalog'
import {FocusRoomMusicPlayer} from './FocusRoomMusicPlayer'
import {FocusRoomDialoguePlayer} from './FocusRoomDialoguePlayer'
import {FocusRoomPomodoro} from './FocusRoomPomodoro'
import {
  FOCUS_ROOM_ACTIVITY_OPTIONS,
  FOCUS_ROOM_GAZE_OPTIONS,
  FOCUS_ROOM_TIME_OPTIONS,
  type FocusRoomActivity,
  type FocusRoomGaze,
} from './focus-room-scene-options'
import {FocusRoomSettings} from './FocusRoomSettings'
import './FocusRoomStudio.css'

const FocusRoomSceneCanvas = clientOnly(() => import('./FocusRoomSceneCanvas.client'), {
  lazy: true,
})
const AUTOMATIC_PERIOD_REFRESH = 60_000

type SceneTime = ScenePeriod

interface SceneAsset {
  readonly depthSource: string
  readonly label: string
  readonly layerScene: PixiLayerSceneDefinition | null
  readonly source: string
}

interface SceneToolbarProps {
  readonly activity: FocusRoomActivity
  readonly gaze: FocusRoomGaze
  readonly isSceneTransitioning: boolean
  readonly onActivityChange: (activity: FocusRoomActivity) => void
  readonly onGazeChange: (gaze: FocusRoomGaze) => void
  readonly onTimeModeChange: (mode: SceneTimeMode) => void
  readonly time: SceneTime
  readonly timeMode: SceneTimeMode
}

const findLabel = <TValue extends string>(
  options: readonly {readonly label: string; readonly value: TValue}[],
  value: TValue,
) => options.find((option) => option.value === value)?.label ?? value

const getSceneAsset = (
  time: SceneTime,
  activity: FocusRoomActivity,
  gaze: FocusRoomGaze,
): SceneAsset => {
  const timeLabel = findLabel(FOCUS_ROOM_TIME_OPTIONS, time)
  const activityLabel = findLabel(FOCUS_ROOM_ACTIVITY_OPTIONS, activity)
  const gazeLabel = findLabel(FOCUS_ROOM_GAZE_OPTIONS, gaze)
  const scene = getFocusRoomScene(time, activity, gaze)

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
        <FocusRoomIconButton
          accessibleLabel={timeAccessibleLabel()}
          class="focus-room-scene-control"
          feedback={timeModeOption().label}
          icon={timeModeOption().icon}
          onPress={() => props.onTimeModeChange(getNextTimeMode(props.timeMode))}
        />
        <FocusRoomIconSelect
          class="focus-room-scene-control"
          label="행동"
          onChange={props.onActivityChange}
          options={FOCUS_ROOM_ACTIVITY_OPTIONS}
          value={props.activity}
        />
        <FocusRoomIconSelect
          class="focus-room-scene-control"
          label="보기"
          onChange={props.onGazeChange}
          options={FOCUS_ROOM_GAZE_OPTIONS}
          value={props.gaze}
        />
        <FocusRoomSettings
          activity={props.activity}
          gaze={props.gaze}
          onActivityChange={props.onActivityChange}
          onGazeChange={props.onGazeChange}
          onTimeModeChange={props.onTimeModeChange}
          timeMode={props.timeMode}
        />
      </div>
      <Show when={props.isSceneTransitioning}>
        <span aria-live="polite" class="focus-room-backdrop focus-room-loading" role="status">
          <span aria-hidden="true" class="focus-room-loading__spinner" />
          장면 전환 중
        </span>
      </Show>
    </div>
  )
}

const FocusRoomStudioContent = () => {
  const events = useFocusRoomEvents()
  const [timeMode, setTimeMode] = createSignal<SceneTimeMode>('day')
  const [automaticPeriod, setAutomaticPeriod] = createSignal<ScenePeriod>('day')
  const [activity, setActivity] = createSignal<FocusRoomActivity>('reading')
  const [gaze, setGaze] = createSignal<FocusRoomGaze>('focused')
  const [isSceneLoading, setIsSceneLoading] = createSignal(true)
  const [hasSceneRendered, setHasSceneRendered] = createSignal(false)
  const [isPlayerExpanded, setIsPlayerExpanded] = createSignal(false)
  const pomoSay = usePomoSay({onBeforeSpeech: events.onStopEntryPlayback})
  const time = createMemo(() => resolveScenePeriod(timeMode(), automaticPeriod()))
  const selectedScene = createMemo(() => getSceneAsset(time(), activity(), gaze()))
  const handleLoadingChange = (isLoading: boolean) => {
    setIsSceneLoading(isLoading)

    if (!isLoading) {
      setHasSceneRendered(true)
    }
  }

  onMount(() => {
    const updateAutomaticPeriod = () => setAutomaticPeriod(getAutomaticScenePeriod(new Date()))
    const timer = window.setInterval(updateAutomaticPeriod, AUTOMATIC_PERIOD_REFRESH)

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
        <FocusRoomSceneCanvas
          activity={activity()}
          depthSource={selectedScene().depthSource}
          gaze={gaze()}
          layerScene={selectedScene().layerScene}
          onLoadingChange={handleLoadingChange}
          source={selectedScene().source}
          time={time()}
        />

        <Show when={isSceneLoading() && !hasSceneRendered()}>
          <div
            aria-live="polite"
            class="pointer-events-none absolute inset-0 grid place-items-center bg-#17130f/24"
            role="status"
          >
            <span class="focus-room-backdrop focus-room-loading">
              <span aria-hidden="true" class="focus-room-loading__spinner" />
              장면을 불러오는 중
            </span>
          </div>
        </Show>
      </figure>

      <FocusRoomPomodoro />
      <div
        class="focus-room-media-dock"
        data-dialogue-active={
          events.activeText() === null &&
          pomoSay.speechText() === null &&
          !events.isEntryPlaybackBlocked()
            ? undefined
            : ''
        }
        data-player-expanded={isPlayerExpanded() ? '' : undefined}
      >
        <FocusRoomMusicPlayer
          expanded={isPlayerExpanded()}
          onExpandedChange={setIsPlayerExpanded}
        />
        <FocusRoomDialoguePlayer
          externalText={pomoSay.speechText()}
          onStopExternalSpeech={pomoSay.stop}
        />
      </div>
      <SceneToolbar
        activity={activity()}
        gaze={gaze()}
        isSceneTransitioning={isSceneLoading() && hasSceneRendered()}
        onActivityChange={setActivity}
        onGazeChange={setGaze}
        onTimeModeChange={setTimeMode}
        time={time()}
        timeMode={timeMode()}
      />
    </section>
  )
}

export const FocusRoomStudio = () => (
  <FocusRoomEventProvider>
    <FocusRoomStudioContent />
  </FocusRoomEventProvider>
)
