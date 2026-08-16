import {A} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, type JSX} from 'solid-js'

import {
  FOCUS_ROOM_SCENES,
  type PSceneCatalogEntry,
  type PSceneId,
} from '../features/focus-room-animation'

const PLayerReviewCanvas = clientOnly(() => import('./PLayerReviewCanvas'), {
  lazy: true,
})

interface LayerToggleProps {
  readonly checked: boolean
  readonly description: string
  readonly label: string
  readonly onChange: (checked: boolean) => void
}

interface ReviewControlsProps {
  readonly animationEnabled: boolean
  readonly eyesVisible: boolean
  readonly handsVisible: boolean
  readonly headVisible: boolean
  readonly onAnimationChange: (enabled: boolean) => void
  readonly onEyesChange: (visible: boolean) => void
  readonly onHandsChange: (visible: boolean) => void
  readonly onHeadChange: (visible: boolean) => void
  readonly onHideAll: () => void
  readonly onReferenceChange: JSX.EventHandler<HTMLInputElement, InputEvent>
  readonly onShowAll: () => void
  readonly referenceOpacity: number
  readonly referencePercentage: number
}

const PANEL_CLASSES = cx(
  'rounded-6 border border-white/10 bg-#17131f/82',
  'shadow-[0_24px_70px_rgba(5,2,10,0.24)] backdrop-blur-xl',
)
const PERCENT_SCALE = 100
const INITIAL_SCENE_ID: PSceneId = 'day-reading-focused'

const LayerToggle = (props: LayerToggleProps) => {
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    props.onChange(event.currentTarget.checked)
  }

  return (
    <label class="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span>
        <span class="block text-sm font-700 text-#fffaf1">{props.label}</span>
        <span class="mt-1 block text-xs leading-5 text-#a99fac">{props.description}</span>
      </span>
      <input
        checked={props.checked}
        class="size-5 shrink-0 accent-#e8c795"
        onChange={handleChange}
        type="checkbox"
      />
    </label>
  )
}

const ScenePicker = (props: {
  readonly onSelect: (id: PSceneId) => void
  readonly selectedId: PSceneId
}) => (
  <nav
    aria-label="프리뷰 장면"
    class={cx(
      PANEL_CLASSES,
      'absolute inset-x-3 top-3 flex gap-2 overflow-x-auto p-2 sm:inset-x-6 sm:top-6',
    )}
  >
    <For each={FOCUS_ROOM_SCENES}>
      {(scene, index) => (
        <button
          aria-pressed={props.selectedId === scene.id}
          class={cx(
            'min-w-40 shrink-0 rounded-4 border px-3 py-2.5 text-left transition-colors',
            props.selectedId === scene.id
              ? 'border-#e8c795 bg-#e8c795 text-#241b12'
              : 'border-white/8 bg-white/4 text-#e7dfe9 hover:bg-white/9',
          )}
          onClick={() => props.onSelect(scene.id)}
          type="button"
        >
          <span class="block text-[10px] font-800 tracking-[0.14em] uppercase opacity-70">
            preview {String(index() + 1).padStart(2, '0')}
          </span>
          <span class="mt-1 block text-xs font-750">{scene.label}</span>
        </button>
      )}
    </For>
  </nav>
)

const ReviewControls = (props: ReviewControlsProps) => (
  <aside
    class={cx(
      PANEL_CLASSES,
      'absolute bottom-3 right-3 max-h-[calc(100dvh-7.75rem)] w-[min(20rem,calc(100%-1.5rem))]',
      'overflow-auto p-4 sm:bottom-6 sm:right-6 sm:max-h-[calc(100dvh-8.75rem)] sm:p-5',
    )}
    aria-label="레이어 검사 도구"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="m-0 text-lg font-750 text-#fffaf1">레이어</h2>
        <p class="mb-0 mt-1 text-xs leading-5 text-#a99fac">
          체크를 해제하면 해당 파트가 숨겨집니다.
        </p>
      </div>
      <span class="shrink-0 whitespace-nowrap rounded-full bg-#e8c795/12 px-3 py-1 text-xs font-700 text-#f2d3a7">
        원본 픽셀
      </span>
    </div>

    <label
      class={cx(
        'mt-3 flex cursor-pointer items-center justify-between gap-4 border-t border-white/8 pt-3',
        'sm:mt-4 sm:pt-4',
      )}
    >
      <span>
        <span class="block text-sm font-700 text-#fffaf1">미세 애니메이션</span>
        <span class="mt-1 block text-xs leading-5 text-#a99fac">
          머리 · 머리카락 · 손 랜덤 왕복
        </span>
      </span>
      <input
        checked={props.animationEnabled}
        class="size-5 shrink-0 accent-#e8c795"
        onChange={(event) => props.onAnimationChange(event.currentTarget.checked)}
        type="checkbox"
      />
    </label>

    <div class="mt-3 divide-y divide-white/8 border-t border-white/8 pt-1 sm:mt-4 sm:pt-2">
      <LayerToggle
        checked={props.headVisible}
        description="분리된 얼굴, 머리카락, 목 연결부"
        label="머리 레이어"
        onChange={props.onHeadChange}
      />
      <LayerToggle
        checked={props.eyesVisible}
        description="원본에서 분리한 홍채와 동공"
        label="눈 레이어"
        onChange={props.onEyesChange}
      />
      <LayerToggle
        checked={props.handsVisible}
        description="분리된 양손, 팔목, 필기 펜"
        label="손 레이어"
        onChange={props.onHandsChange}
      />
    </div>

    <div class="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
      <button
        class="rounded-3 bg-#e8c795 px-3 py-2.5 text-sm font-750 text-#241b12 hover:bg-#f2d3a7"
        onClick={() => props.onShowAll()}
        type="button"
      >
        모두 표시
      </button>
      <button
        class="rounded-3 bg-white/8 px-3 py-2.5 text-sm font-700 text-#e7dfe9 hover:bg-white/12"
        onClick={() => props.onHideAll()}
        type="button"
      >
        모두 숨김
      </button>
    </div>

    <div class="mt-3 border-t border-white/8 pt-3 sm:mt-4 sm:pt-4">
      <div class="flex items-center justify-between gap-4">
        <label class="text-sm font-700 text-#fffaf1" for="reference-opacity">
          원본 오버레이
        </label>
        <output class="text-xs tabular-nums text-#e8c795" for="reference-opacity">
          {props.referencePercentage}%
        </output>
      </div>
      <input
        class="mt-3 w-full accent-#e8c795"
        id="reference-opacity"
        max="1"
        min="0"
        onInput={(event) => props.onReferenceChange(event)}
        step="0.05"
        type="range"
        value={props.referenceOpacity}
      />
      <p class="mb-0 mt-2 text-xs leading-5 text-#a99fac">
        값을 올리면 원본 장면이 위에 겹쳐져 가장자리 차이를 확인할 수 있습니다.
      </p>
    </div>
  </aside>
)

export const PLayerReview = () => {
  const [selectedId, setSelectedId] = createSignal<PSceneId>(INITIAL_SCENE_ID)
  const [headVisible, setHeadVisible] = createSignal(true)
  const [handsVisible, setHandsVisible] = createSignal(true)
  const [animationEnabled, setAnimationEnabled] = createSignal(true)
  const [eyesVisible, setEyesVisible] = createSignal(true)
  const [referenceOpacity, setReferenceOpacity] = createSignal(0)
  const selectedScene = createMemo<PSceneCatalogEntry>(() => {
    const scene = FOCUS_ROOM_SCENES.find((candidate) => candidate.id === selectedId())

    if (scene === undefined) {
      throw new Error(`Missing preview scene: ${selectedId()}`)
    }

    return scene
  })
  const referencePercentage = () => Math.round(referenceOpacity() * PERCENT_SCALE)
  const handleReferenceChange: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    setReferenceOpacity(event.currentTarget.valueAsNumber)
  }
  const handleSelect = (id: PSceneId) => {
    setSelectedId(id)
    setHeadVisible(true)
    setEyesVisible(true)
    setHandsVisible(true)
    setReferenceOpacity(0)
  }
  const handleShowAll = () => {
    setHeadVisible(true)
    setEyesVisible(true)
    setHandsVisible(true)
  }
  const handleHideAll = () => {
    setHeadVisible(false)
    setEyesVisible(false)
    setHandsVisible(false)
  }

  return (
    <section class="relative h-dvh w-full overflow-hidden bg-#17130f">
      <figure aria-label={selectedScene().label} class="absolute inset-0 m-0" role="img">
        <PLayerReviewCanvas
          animationEnabled={animationEnabled()}
          definition={selectedScene().layerScene}
          eyesVisible={eyesVisible()}
          fallback={
            <div class="grid h-full place-items-center text-sm text-#a99fac">PixiJS 준비 중</div>
          }
          handsVisible={handsVisible()}
          headVisible={headVisible()}
          referenceOpacity={referenceOpacity()}
        />
      </figure>

      <ScenePicker onSelect={handleSelect} selectedId={selectedId()} />

      <header
        class={cx(
          PANEL_CLASSES,
          'absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] px-4 py-3 sm:bottom-6 sm:left-6 sm:max-w-xl',
        )}
      >
        <p class="m-0 text-[10px] font-750 tracking-[0.2em] text-#e8c795 uppercase">
          PixiJS 12 scene preview
        </p>
        <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <h1 class="m-0 text-lg font-800 tracking--0.03em text-#fffaf1 sm:text-2xl">
            {selectedScene().label}
          </h1>
          <A class="text-xs font-700 text-#d7c7b3 no-underline hover:text-white" href="/">
            포커스 룸으로 →
          </A>
        </div>
        <p class="mb-0 mt-1 text-xs text-#bdb2c4">1672 × 941 · 분리 레이어</p>
      </header>

      <ReviewControls
        animationEnabled={animationEnabled()}
        eyesVisible={eyesVisible()}
        handsVisible={handsVisible()}
        headVisible={headVisible()}
        onAnimationChange={setAnimationEnabled}
        onEyesChange={setEyesVisible}
        onHandsChange={setHandsVisible}
        onHeadChange={setHeadVisible}
        onHideAll={handleHideAll}
        onReferenceChange={handleReferenceChange}
        onShowAll={handleShowAll}
        referenceOpacity={referenceOpacity()}
        referencePercentage={referencePercentage()}
      />
    </section>
  )
}
