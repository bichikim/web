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
import {FocusRoomMusicPlayer} from './FocusRoomMusicPlayer'

const FocusRoomSceneCanvas = clientOnly(() => import('./FocusRoomSceneCanvas.client'), {
  lazy: true,
})
const AUTOMATIC_PERIOD_REFRESH = 60_000

const TIME_MODE_OPTIONS = [
  {icon: 'i-tabler-sun', label: '낮', value: 'day'},
  {icon: 'i-tabler-moon', label: '밤', value: 'night'},
  {icon: 'i-tabler-sun-moon', label: '자동', value: 'auto'},
] as const
const TIME_LABELS = [
  {label: '낮', value: 'day'},
  {label: '밤', value: 'night'},
] as const
const ACTIVITY_OPTIONS = [
  {icon: 'i-tabler-book-2', label: '책 읽기', value: 'reading'},
  {icon: 'i-tabler-pencil', label: '글쓰기', value: 'writing'},
  {icon: 'i-tabler-keyboard', label: '노트북 타이핑', value: 'typing'},
] as const
const GAZE_OPTIONS = [
  {icon: 'i-tabler-focus-2', label: '작업에 집중', value: 'focused'},
  {icon: 'i-tabler-user-scan', label: '사용자 보기', value: 'user'},
] as const

type SceneTime = ScenePeriod
type SceneActivity = (typeof ACTIVITY_OPTIONS)[number]['value']
type SceneGaze = (typeof GAZE_OPTIONS)[number]['value']

interface SceneAsset {
  readonly depthSource: string
  readonly label: string
  readonly source: string
}

interface SceneToolbarProps {
  readonly activity: SceneActivity
  readonly gaze: SceneGaze
  readonly onActivityChange: (activity: SceneActivity) => void
  readonly onGazeChange: (gaze: SceneGaze) => void
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
} satisfies Record<SceneTime, Record<SceneActivity, Record<SceneGaze, string>>>

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
} satisfies Record<SceneTime, Record<SceneActivity, Record<SceneGaze, string>>>

const findLabel = <TValue extends string>(
  options: readonly {readonly label: string; readonly value: TValue}[],
  value: TValue,
) => options.find((option) => option.value === value)?.label ?? value

const getSceneAsset = (time: SceneTime, activity: SceneActivity, gaze: SceneGaze): SceneAsset => {
  const timeLabel = findLabel(TIME_LABELS, time)
  const activityLabel = findLabel(ACTIVITY_OPTIONS, activity)
  const gazeLabel = findLabel(GAZE_OPTIONS, gaze)

  return {
    depthSource: DEPTH_SOURCES[time][activity][gaze],
    label: `${timeLabel} · ${activityLabel} · ${gazeLabel}`,
    source: SCENE_SOURCES[time][activity][gaze],
  }
}

const SceneToolbar = (props: SceneToolbarProps) => {
  const timeModeOption = () =>
    TIME_MODE_OPTIONS.find((option) => option.value === props.timeMode) ?? TIME_MODE_OPTIONS[0]
  const timeAccessibleLabel = () => {
    const option = timeModeOption()

    return option.value === 'auto'
      ? `시간대 자동, 현재 ${findLabel(TIME_LABELS, props.time)}`
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
          feedback={timeModeOption().label}
          icon={timeModeOption().icon}
          onPress={() => props.onTimeModeChange(getNextTimeMode(props.timeMode))}
        />
        <FocusRoomIconSelect
          label="행동"
          onChange={props.onActivityChange}
          options={ACTIVITY_OPTIONS}
          value={props.activity}
        />
        <FocusRoomIconSelect
          label="시선"
          onChange={props.onGazeChange}
          options={GAZE_OPTIONS}
          value={props.gaze}
        />
      </div>
    </div>
  )
}

export const FocusRoomStudio = () => {
  const [timeMode, setTimeMode] = createSignal<SceneTimeMode>('day')
  const [automaticPeriod, setAutomaticPeriod] = createSignal<ScenePeriod>('day')
  const [activity, setActivity] = createSignal<SceneActivity>('reading')
  const [gaze, setGaze] = createSignal<SceneGaze>('focused')
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
                ? 'left-4 top-20 sm:bottom-24 sm:top-auto'
                : 'inset-0 grid place-items-center bg-#17130f/24',
            )}
            role="status"
          >
            <span
              class={cx(
                'flex items-center gap-3 rounded-full bg-[var(--focus-room-glass)] px-5 py-3',
                'focus-room-backdrop text-sm font-650 text-white shadow-lg',
              )}
            >
              <span
                aria-hidden="true"
                class="size-5 animate-spin rounded-full border-2 border-white/28 border-t-#e8c795"
              />
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
