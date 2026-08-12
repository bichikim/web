import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, Show} from 'solid-js'

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

const FocusRoomSceneCanvas = clientOnly(() => import('./FocusRoomSceneCanvas.client'), {
  lazy: true,
})

const TIME_OPTIONS = [
  {label: '낮', value: 'day'},
  {label: '밤', value: 'night'},
] as const
const ACTIVITY_OPTIONS = [
  {label: '책 읽기', value: 'reading'},
  {label: '글쓰기', value: 'writing'},
  {label: '노트북 타이핑', value: 'typing'},
] as const
const GAZE_OPTIONS = [
  {label: '작업에 집중', value: 'focused'},
  {label: '사용자 보기', value: 'user'},
] as const

type SceneTime = (typeof TIME_OPTIONS)[number]['value']
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
  readonly onTimeChange: (time: SceneTime) => void
  readonly time: SceneTime
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

const SELECT_CLASSES = cx(
  'h-11 min-w-34 appearance-none rounded-full border border-white/14 bg-#15120f/78',
  'px-4 pr-9 text-sm font-650 text-#fffaf1 shadow-sm outline-none backdrop-blur-xl',
  'transition hover:border-white/28 focus:border-#d9b98a',
  'bg-[linear-gradient(45deg,transparent_50%,#d9b98a_50%),linear-gradient(135deg,#d9b98a_50%,transparent_50%)]',
  'bg-[position:calc(100%-17px)_19px,calc(100%-12px)_19px] bg-[size:5px_5px,5px_5px] bg-no-repeat',
)

const findLabel = <TValue extends string>(
  options: readonly {readonly label: string; readonly value: TValue}[],
  value: TValue,
) => options.find((option) => option.value === value)?.label ?? value

const isSceneTime = (value: string): value is SceneTime =>
  TIME_OPTIONS.some((option) => option.value === value)

const isSceneActivity = (value: string): value is SceneActivity =>
  ACTIVITY_OPTIONS.some((option) => option.value === value)

const isSceneGaze = (value: string): value is SceneGaze =>
  GAZE_OPTIONS.some((option) => option.value === value)

const getSceneAsset = (time: SceneTime, activity: SceneActivity, gaze: SceneGaze): SceneAsset => {
  const timeLabel = findLabel(TIME_OPTIONS, time)
  const activityLabel = findLabel(ACTIVITY_OPTIONS, activity)
  const gazeLabel = findLabel(GAZE_OPTIONS, gaze)

  return {
    depthSource: DEPTH_SOURCES[time][activity][gaze],
    label: `${timeLabel} · ${activityLabel} · ${gazeLabel}`,
    source: SCENE_SOURCES[time][activity][gaze],
  }
}

const SceneToolbar = (props: SceneToolbarProps) => {
  const handleTimeChange = (event: Event & {currentTarget: HTMLSelectElement}) => {
    const {value} = event.currentTarget

    if (isSceneTime(value)) {
      props.onTimeChange(value)
    }
  }

  const handleActivityChange = (event: Event & {currentTarget: HTMLSelectElement}) => {
    const {value} = event.currentTarget

    if (isSceneActivity(value)) {
      props.onActivityChange(value)
    }
  }

  const handleGazeChange = (event: Event & {currentTarget: HTMLSelectElement}) => {
    const {value} = event.currentTarget

    if (isSceneGaze(value)) {
      props.onGazeChange(value)
    }
  }

  return (
    <div
      class={cx(
        'absolute inset-x-4 bottom-4 z-30 flex justify-end sm:inset-x-auto',
        'sm:bottom-auto sm:right-7 sm:top-6',
      )}
    >
      <div
        class="flex flex-wrap justify-end gap-2 rounded-5 bg-black/34 p-3 backdrop-blur-xl"
        role="group"
        aria-label="장면 설정"
      >
        <label class="grid gap-1.5 text-xs font-650 text-#c9c0b5">
          시간대
          <select class={SELECT_CLASSES} onChange={handleTimeChange} value={props.time}>
            <For each={TIME_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </select>
        </label>

        <label class="grid gap-1.5 text-xs font-650 text-#c9c0b5">
          행동
          <select class={SELECT_CLASSES} onChange={handleActivityChange} value={props.activity}>
            <For each={ACTIVITY_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </select>
        </label>

        <label class="grid gap-1.5 text-xs font-650 text-#c9c0b5">
          시선
          <select class={SELECT_CLASSES} onChange={handleGazeChange} value={props.gaze}>
            <For each={GAZE_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </select>
        </label>
      </div>
    </div>
  )
}

export const FocusRoomStudio = () => {
  const [time, setTime] = createSignal<SceneTime>('day')
  const [activity, setActivity] = createSignal<SceneActivity>('reading')
  const [gaze, setGaze] = createSignal<SceneGaze>('focused')
  const [isSceneLoading, setIsSceneLoading] = createSignal(true)
  const selectedScene = createMemo(() => getSceneAsset(time(), activity(), gaze()))

  return (
    <section aria-label="포커스 룸" class="relative h-dvh w-full overflow-hidden">
      <SceneToolbar
        activity={activity()}
        gaze={gaze()}
        onActivityChange={setActivity}
        onGazeChange={setGaze}
        onTimeChange={setTime}
        time={time()}
      />

      <figure
        aria-label={selectedScene().label}
        class="relative m-0 h-full w-full overflow-hidden bg-#17130f"
        role="img"
      >
        <FocusRoomSceneCanvas
          activity={activity()}
          depthSource={selectedScene().depthSource}
          gaze={gaze()}
          onLoadingChange={setIsSceneLoading}
          source={selectedScene().source}
          time={time()}
        />

        <Show when={isSceneLoading()}>
          <div
            aria-live="polite"
            class="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-#17130f/24"
            role="status"
          >
            <span
              class={cx(
                'flex items-center gap-3 rounded-full bg-black/56 px-5 py-3',
                'text-sm font-650 text-white shadow-lg backdrop-blur-md',
              )}
            >
              <span
                aria-hidden="true"
                class="size-5 animate-spin rounded-full border-2 border-white/28 border-t-#e8c795"
              />
              장면을 불러오는 중
            </span>
          </div>
        </Show>
      </figure>
    </section>
  )
}
