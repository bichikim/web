import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, onCleanup, onMount, Show} from 'solid-js'

import {FocusRoomIconButton} from '../design-system/FocusRoomIconButton'
import {FocusRoomIconSelect} from '../design-system/FocusRoomIconSelect'
import {
  getAutomaticScenePeriod,
  getNextTimeMode,
  resolveScenePeriod,
  type ScenePeriod,
  type SceneTimeMode,
} from '../features/focus-room-time'
import type {PixiLayerSceneDefinition} from '../features/focus-room-animation/layer-scene'
import {getFocusRoomScene} from '../features/focus-room-animation/scene-catalog'
import {FocusRoomMusicPlayer} from './FocusRoomMusicPlayer'
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
        'absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex justify-end',
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

        <Show when={isSceneLoading()}>
          <div
            aria-live="polite"
            class={cx(
              'pointer-events-none absolute',
              hasSceneRendered()
                ? cx(
                    'left-[calc(1rem+env(safe-area-inset-left))]',
                    'top-[calc(1rem+env(safe-area-inset-top))] sm:left-7 sm:top-6',
                  )
                : 'inset-0 grid place-items-center bg-#17130f/24',
            )}
            role="status"
          >
            <span class="focus-room-backdrop focus-room-loading">
              <span aria-hidden="true" class="focus-room-loading__spinner" />
              <Show when={hasSceneRendered()} fallback="장면을 불러오는 중">
                장면 전환 중
              </Show>
            </span>
          </div>
        </Show>
      </figure>

      <FocusRoomMusicPlayer />
      <SceneToolbar
        activity={activity()}
        gaze={gaze()}
        onActivityChange={setActivity}
        onGazeChange={setGaze}
        onTimeModeChange={setTimeMode}
        time={time()}
        timeMode={timeMode()}
      />
    </section>
  )
}
