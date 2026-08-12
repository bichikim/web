import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createEffect, createMemo, createSignal, For, Show, untrack} from 'solid-js'

import dayReadingImage from '../../assets/concept-art/focus-room-day-reading-concept.png'
import dayReadingGazeImage from '../../assets/concept-art/focus-room-day-reading-user-gaze-concept.png'
import dayTypingImage from '../../assets/concept-art/focus-room-day-typing-concept.png'
import dayTypingGazeImage from '../../assets/concept-art/focus-room-day-typing-user-gaze-concept.png'
import dayWritingImage from '../../assets/concept-art/focus-room-day-writing-concept.png'
import dayWritingGazeImage from '../../assets/concept-art/focus-room-day-writing-user-gaze-concept.png'
import nightReadingImage from '../../assets/concept-art/focus-room-night-reading-concept.png'
import nightReadingGazeImage from '../../assets/concept-art/focus-room-night-reading-user-gaze-concept.png'
import nightTypingImage from '../../assets/concept-art/focus-room-night-typing-concept.png'
import nightTypingGazeImage from '../../assets/concept-art/focus-room-night-typing-user-gaze-concept.png'
import nightWritingImage from '../../assets/concept-art/focus-room-night-desk-concept.png'
import nightWritingGazeImage from '../../assets/concept-art/focus-room-night-writing-user-gaze-concept.png'

const FocusRoomBlinkOverlay = clientOnly(() => import('./FocusRoomBlinkOverlay.client'), {
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
type TransitionPhase = 'fading' | 'idle' | 'loading'

interface SceneAsset {
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
    <header class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-2xl">
        <p class="m-0 text-xs font-750 tracking-[0.22em] text-#d9b98a uppercase">
          2D character room
        </p>
        <h1 class="mb-0 mt-3 text-3xl font-800 tracking--0.035em sm:text-4xl" id="focus-room-title">
          포커스 룸
        </h1>
        <p class="mb-0 mt-3 text-sm leading-6 text-#c9c0b5 sm:text-base">
          시간대와 행동, 시선을 바꿔 캐릭터 장면을 비교해 보세요.
        </p>
      </div>

      <div class="flex flex-wrap gap-2" role="group" aria-label="장면 설정">
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
    </header>
  )
}

export const FocusRoomStudio = () => {
  const [time, setTime] = createSignal<SceneTime>('day')
  const [activity, setActivity] = createSignal<SceneActivity>('reading')
  const [gaze, setGaze] = createSignal<SceneGaze>('focused')
  const selectedScene = createMemo(() => getSceneAsset(time(), activity(), gaze()))
  const [currentScene, setCurrentScene] = createSignal(untrack(selectedScene))
  const [incomingScene, setIncomingScene] = createSignal<SceneAsset | null>(null)
  const [transitionPhase, setTransitionPhase] = createSignal<TransitionPhase>('idle')

  createEffect(() => {
    const nextScene = selectedScene()
    const current = currentScene()

    if (nextScene.source === current.source) {
      setIncomingScene(null)
      setTransitionPhase('idle')
      return
    }

    setTransitionPhase('loading')
    setIncomingScene(nextScene)
  })

  const handleIncomingLoad = () => {
    if (transitionPhase() === 'loading') {
      setTransitionPhase('fading')
    }
  }

  const handleIncomingAnimationEnd = () => {
    if (transitionPhase() !== 'fading') {
      return
    }

    const incoming = incomingScene()

    if (incoming === null) {
      return
    }

    setCurrentScene(incoming)
    setIncomingScene(null)
    setTransitionPhase('idle')
  }

  return (
    <section aria-labelledby="focus-room-title" class="grid gap-5">
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
        class={cx(
          'relative m-0 aspect-[1672/941] overflow-hidden rounded-5 border border-white/10 bg-#17130f',
          'shadow-[0_32px_100px_rgba(0,0,0,0.38)] sm:rounded-7',
        )}
        role="img"
      >
        <img
          alt=""
          class="absolute inset-0 h-full w-full object-cover"
          height="941"
          src={currentScene().source}
          width="1672"
        />

        <Show when={incomingScene()}>
          {(scene) => (
            <img
              alt=""
              class="pomo-scene-incoming absolute inset-0 h-full w-full object-cover"
              classList={{
                'pomo-scene-fading': transitionPhase() === 'fading',
              }}
              height="941"
              onAnimationEnd={handleIncomingAnimationEnd}
              onLoad={handleIncomingLoad}
              src={scene().source}
              width="1672"
            />
          )}
        </Show>

        <FocusRoomBlinkOverlay
          activity={activity()}
          gaze={gaze()}
          sceneReady={transitionPhase() === 'idle'}
          time={time()}
        />

        <div
          class={cx(
            'pointer-events-none absolute inset-x-0 bottom-0 h-24',
            'bg-gradient-to-t from-black/38 to-transparent',
          )}
        />
        <figcaption
          aria-live="polite"
          class={cx(
            'pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/12',
            'bg-black/42 px-3 py-2 text-xs font-650 text-white/88 backdrop-blur-md',
            'sm:bottom-5 sm:left-5',
          )}
        >
          {selectedScene().label}
        </figcaption>
      </figure>
    </section>
  )
}
