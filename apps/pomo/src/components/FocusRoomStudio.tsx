import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, onCleanup, onMount, Show} from 'solid-js'

import dayReadingImage from '../../assets/concept-art/focus-room-day-reading-concept.webp'
import dayReadingGazeImage from '../../assets/concept-art/focus-room-day-reading-user-gaze-concept.webp'
import dayTypingImage from '../../assets/concept-art/focus-room-day-typing-concept.webp'
import dayTypingGazeImage from '../../assets/concept-art/focus-room-day-typing-user-gaze-concept.webp'
import dayWritingImage from '../../assets/concept-art/focus-room-day-writing-concept.webp'
import dayWritingGazeImage from '../../assets/concept-art/focus-room-day-writing-user-gaze-concept.webp'
import nightReadingImage from '../../assets/concept-art/focus-room-night-reading-concept.webp'
import nightReadingGazeImage from '../../assets/concept-art/focus-room-night-reading-user-gaze-concept.webp'
import nightTypingImage from '../../assets/concept-art/focus-room-night-typing-concept.webp'
import nightTypingGazeImage from '../../assets/concept-art/focus-room-night-typing-user-gaze-concept.webp'
import nightWritingImage from '../../assets/concept-art/focus-room-night-desk-concept.webp'
import nightWritingGazeImage from '../../assets/concept-art/focus-room-night-writing-user-gaze-concept.webp'
import dayReadingDepth from '../../assets/focus-room-depth/depth-day-reading.png'
import dayReadingGazeDepth from '../../assets/focus-room-depth/depth-day-reading-user-gaze.png'
import dayTypingDepth from '../../assets/focus-room-depth/depth-day-typing.png'
import dayTypingGazeDepth from '../../assets/focus-room-depth/depth-day-typing-user-gaze.png'
import dayWritingDepth from '../../assets/focus-room-depth/depth-day-writing.png'
import dayWritingGazeDepth from '../../assets/focus-room-depth/depth-day-writing-user-gaze.png'
import nightReadingDepth from '../../assets/focus-room-depth/depth-night-reading.png'
import nightReadingGazeDepth from '../../assets/focus-room-depth/depth-night-reading-user-gaze.png'
import nightTypingDepth from '../../assets/focus-room-depth/depth-night-typing.png'
import nightTypingGazeDepth from '../../assets/focus-room-depth/depth-night-typing-user-gaze.png'
import nightWritingDepth from '../../assets/focus-room-depth/depth-night-desk.png'
import nightWritingGazeDepth from '../../assets/focus-room-depth/depth-night-writing-user-gaze.png'
import {FocusRoomIconButton} from '../design-system/FocusRoomIconButton'
import {FocusRoomIconSelect} from '../design-system/FocusRoomIconSelect'
import {
  getAutomaticScenePeriod,
  getNextTimeMode,
  resolveScenePeriod,
  type ScenePeriod,
  type SceneTimeMode,
} from '../features/focus-room-time'
import {DAY_WRITING_LAYER_SCENE} from '../features/focus-room-animation/day-writing-layer-scene'
import type {PixiLayerSceneDefinition} from '../features/focus-room-animation/layer-scene'
import {FocusRoomMusicPlayer} from './FocusRoomMusicPlayer'
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

const SCENE_SOURCES = {
  day: {
    reading: {focused: dayReadingImage, user: dayReadingGazeImage},
    typing: {focused: dayTypingImage, user: dayTypingGazeImage},
    writing: {focused: dayWritingImage, user: dayWritingGazeImage},
  },
  night: {
    reading: {focused: nightReadingImage, user: nightReadingGazeImage},
    typing: {focused: nightTypingImage, user: nightTypingGazeImage},
    writing: {focused: nightWritingImage, user: nightWritingGazeImage},
  },
} satisfies Record<SceneTime, Record<FocusRoomActivity, Record<FocusRoomGaze, string>>>

const DEPTH_SOURCES = {
  day: {
    reading: {focused: dayReadingDepth, user: dayReadingGazeDepth},
    typing: {focused: dayTypingDepth, user: dayTypingGazeDepth},
    writing: {focused: dayWritingDepth, user: dayWritingGazeDepth},
  },
  night: {
    reading: {focused: nightReadingDepth, user: nightReadingGazeDepth},
    typing: {focused: nightTypingDepth, user: nightTypingGazeDepth},
    writing: {focused: nightWritingDepth, user: nightWritingGazeDepth},
  },
} satisfies Record<SceneTime, Record<FocusRoomActivity, Record<FocusRoomGaze, string>>>

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

  return {
    depthSource: DEPTH_SOURCES[time][activity][gaze],
    label: `${timeLabel} · ${activityLabel} · ${gazeLabel}`,
    layerScene:
      time === 'day' && activity === 'writing' && gaze === 'focused'
        ? DAY_WRITING_LAYER_SCENE
        : null,
    source: SCENE_SOURCES[time][activity][gaze],
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

export const FocusRoomStudio = () => {
  const [timeMode, setTimeMode] = createSignal<SceneTimeMode>('day')
  const [automaticPeriod, setAutomaticPeriod] = createSignal<ScenePeriod>('day')
  const [activity, setActivity] = createSignal<FocusRoomActivity>('reading')
  const [gaze, setGaze] = createSignal<FocusRoomGaze>('focused')
  const [isSceneLoading, setIsSceneLoading] = createSignal(true)
  const [hasSceneRendered, setHasSceneRendered] = createSignal(false)
  const [isPomodoroOpen, setIsPomodoroOpen] = createSignal(false)
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

      <FocusRoomPomodoro onOpenChange={setIsPomodoroOpen} />
      <FocusRoomMusicPlayer isHidden={isPomodoroOpen()} />
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
