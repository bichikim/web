import {clientOnly} from '@solidjs/start'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createSignal, type JSX} from 'solid-js'

const FocusRoomLayerReviewCanvas = clientOnly(() => import('./FocusRoomLayerReviewCanvas.client'), {
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
  readonly handsVisible: boolean
  readonly headVisible: boolean
  readonly onAnimationChange: (enabled: boolean) => void
  readonly onHandsChange: (visible: boolean) => void
  readonly onHeadChange: (visible: boolean) => void
  readonly onHideAll: () => void
  readonly onReferenceChange: JSX.EventHandler<HTMLInputElement, InputEvent>
  readonly onShowAll: () => void
  readonly referenceOpacity: number
  readonly referencePercentage: number
}

const PANEL_CLASSES = cx(
  'rounded-6 border border-white/10 bg-white/5',
  'shadow-[0_24px_70px_rgba(5,2,10,0.24)]',
)
const PERCENT_SCALE = 100

const LayerToggle = (props: LayerToggleProps) => {
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    props.onChange(event.currentTarget.checked)
  }

  return (
    <label class="flex cursor-pointer items-center justify-between gap-4 py-3">
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

const ReviewControls = (props: ReviewControlsProps) => (
  <aside
    class={cx(
      PANEL_CLASSES,
      'absolute inset-x-3 bottom-3 max-h-[45dvh] overflow-auto bg-#17131f/88 p-5 backdrop-blur-xl',
      'sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-80 lg:bottom-auto lg:top-6',
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
      <span class="rounded-full bg-#e8c795/12 px-3 py-1 text-xs font-700 text-#f2d3a7">
        원본 픽셀
      </span>
    </div>

    <div class="mt-4 divide-y divide-white/8">
      <LayerToggle
        checked={props.headVisible}
        description="얼굴, 머리카락, 목 연결부"
        label="머리"
        onChange={props.onHeadChange}
      />
      <LayerToggle
        checked={props.handsVisible}
        description="양손, 팔목, 필기 펜"
        label="손 + 팔목"
        onChange={props.onHandsChange}
      />
    </div>

    <div class="mt-4 grid grid-cols-2 gap-2">
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

    <div class="mt-6 border-t border-white/8 pt-5">
      <label class="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span class="block text-sm font-700 text-#fffaf1">미세 애니메이션</span>
          <span class="mt-1 block text-xs leading-5 text-#a99fac">
            머리 오뚜기 회전과 필기 오른손 회전
          </span>
        </span>
        <input
          checked={props.animationEnabled}
          class="size-5 shrink-0 accent-#e8c795"
          onChange={(event) => props.onAnimationChange(event.currentTarget.checked)}
          type="checkbox"
        />
      </label>
    </div>

    <div class="mt-6 border-t border-white/8 pt-5">
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

export const FocusRoomLayerReview = () => {
  const [headVisible, setHeadVisible] = createSignal(true)
  const [handsVisible, setHandsVisible] = createSignal(true)
  const [animationEnabled, setAnimationEnabled] = createSignal(false)
  const [referenceOpacity, setReferenceOpacity] = createSignal(0)
  const referencePercentage = () => Math.round(referenceOpacity() * PERCENT_SCALE)
  const handleReferenceChange: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    setReferenceOpacity(event.currentTarget.valueAsNumber)
  }
  const handleShowAll = () => {
    setHeadVisible(true)
    setHandsVisible(true)
  }
  const handleHideAll = () => {
    setHeadVisible(false)
    setHandsVisible(false)
  }

  return (
    <section class="relative h-dvh w-full overflow-hidden bg-#17130f">
      <figure
        aria-label="낮 글쓰기 포커스 룸 파트 조합 결과"
        class="absolute inset-0 m-0"
        role="img"
      >
        <FocusRoomLayerReviewCanvas
          animationEnabled={animationEnabled()}
          fallback={
            <div class="grid h-full place-items-center text-sm text-#a99fac">PixiJS 준비 중</div>
          }
          handsVisible={handsVisible()}
          headVisible={headVisible()}
          referenceOpacity={referenceOpacity()}
        />
      </figure>

      <header
        class={cx(
          PANEL_CLASSES,
          'absolute left-3 top-3 max-w-[calc(100%-1.5rem)] bg-#17131f/78 px-4 py-3 backdrop-blur-xl',
          'sm:left-6 sm:top-6 sm:max-w-xl sm:px-5 sm:py-4',
        )}
      >
        <p class="m-0 text-[10px] font-750 tracking-[0.2em] text-#e8c795 uppercase">
          PixiJS layer review
        </p>
        <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <h1 class="m-0 text-lg font-800 tracking--0.03em text-#fffaf1 sm:text-2xl">
            낮 · 글쓰기 파트 조합
          </h1>
          <A class="text-xs font-700 text-#d7c7b3 no-underline hover:text-white" href="/focus-room">
            포커스 룸으로 →
          </A>
        </div>
        <p class="mb-0 mt-1 text-xs text-#bdb2c4">1672 × 941 · preview base → head → hands</p>
      </header>

      <ReviewControls
        animationEnabled={animationEnabled()}
        handsVisible={handsVisible()}
        headVisible={headVisible()}
        onAnimationChange={setAnimationEnabled}
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
