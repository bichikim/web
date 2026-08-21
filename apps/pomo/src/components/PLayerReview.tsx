import {A} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, type JSX, Show} from 'solid-js'

import {
  FOCUS_ROOM_SCENES,
  type PEyeMode,
  type PSceneCatalogEntry,
  type PSceneId,
  type PSceneStyle,
} from '../features/focus-room-animation'
import {P_VISEMES, type PViseme} from '../features/lip-sync'

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
  readonly eyeMode: PEyeMode
  readonly eyesVisible: boolean
  readonly handsVisible: boolean
  readonly headVisible: boolean
  readonly mouthVisible: boolean
  readonly onAnimationChange: (enabled: boolean) => void
  readonly onCollapse: () => void
  readonly onEyesChange: (visible: boolean) => void
  readonly onEyeModeChange: (eyeMode: PEyeMode) => void
  readonly onHandsChange: (visible: boolean) => void
  readonly onHeadChange: (visible: boolean) => void
  readonly onHideAll: () => void
  readonly onMouthChange: (visible: boolean) => void
  readonly onReferenceChange: JSX.EventHandler<HTMLInputElement, InputEvent>
  readonly onSceneStyleChange: (sceneStyle: PSceneStyle) => void
  readonly onShowAll: () => void
  readonly referenceOpacity: number
  readonly referencePercentage: number
  readonly sceneStyle: PSceneStyle
  readonly viseme: PViseme
  readonly onVisemeChange: (viseme: PViseme) => void
}

const VISEME_LABELS: Readonly<Record<PViseme, string>> = {
  closed: '입술 닫힘 · ㅁ/ㅂ/ㅍ',
  narrow: '좁은 입 · ㅡ/가벼운 자음',
  open: '열린 입 · ㅏ/ㅓ',
  rest: '기본 미소 · 무음',
  round: '둥근 입 · ㅗ/ㅜ',
  wide: '넓은 입 · ㅐ/ㅔ/ㅣ',
}

const EYE_MODES = ['auto', 'open', 'half', 'closed'] as const satisfies ReadonlyArray<PEyeMode>
const EYE_MODE_LABELS: Readonly<Record<PEyeMode, string>> = {
  auto: '자동 깜박임',
  closed: '완전히 감은 눈',
  half: '반쯤 감은 눈',
  open: '열린 눈',
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

const EyeModePicker = (props: {
  readonly eyeMode: PEyeMode
  readonly onChange: (eyeMode: PEyeMode) => void
}) => (
  <label class="mt-3 block border-t border-white/8 pt-3 sm:mt-4 sm:pt-4">
    <span class="block text-sm font-700 text-#fffaf1">눈 깜박임 단계</span>
    <span class="mt-1 block text-xs leading-5 text-#a99fac">
      자동 움직임이나 눈 프레임 한 단계를 고정해서 검사합니다.
    </span>
    <select
      class="mt-2 h-10 w-full rounded-3 border border-white/12 bg-#211a24 px-3 text-sm text-#fffaf1"
      onChange={(event) => props.onChange(event.currentTarget.value as PEyeMode)}
      value={props.eyeMode}
    >
      <For each={EYE_MODES}>
        {(eyeMode) => <option value={eyeMode}>{EYE_MODE_LABELS[eyeMode]}</option>}
      </For>
    </select>
  </label>
)

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
    id="layer-review-controls"
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
      <div class="flex shrink-0 items-center gap-2">
        <span class="whitespace-nowrap rounded-full bg-#e8c795/12 px-3 py-1 text-xs font-700 text-#f2d3a7">
          {props.sceneStyle === 'scribble' ? '하찮은 픽셀' : '원본 픽셀'}
        </span>
        <button
          aria-controls="layer-review-controls"
          aria-expanded="true"
          aria-label="레이어 패널 축소"
          class={cx(
            'grid size-8 place-items-center rounded-full bg-white/8 text-#e7dfe9',
            'hover:bg-white/14 hover:text-white',
          )}
          onClick={() => props.onCollapse()}
          title="레이어 패널 축소"
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-layout-sidebar-right-collapse size-4" />
        </button>
      </div>
    </div>

    <div class="mt-3 border-t border-white/8 pt-1 sm:mt-4 sm:pt-2">
      <LayerToggle
        checked={props.sceneStyle === 'scribble'}
        description="준비된 낮 장면을 일부러 서툴게 그린 이미지로 바꿉니다."
        label="하찮은 스타일"
        onChange={(checked) => props.onSceneStyleChange(checked ? 'scribble' : 'original')}
      />
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
        checked={props.mouthVisible}
        description="선택한 발음의 입과 하관 패치"
        label="입 레이어"
        onChange={props.onMouthChange}
      />
      <LayerToggle
        checked={props.handsVisible}
        description="분리된 양손, 팔목, 필기 펜"
        label="손 레이어"
        onChange={props.onHandsChange}
      />
    </div>

    <EyeModePicker eyeMode={props.eyeMode} onChange={props.onEyeModeChange} />

    <label class="mt-3 block border-t border-white/8 pt-3 sm:mt-4 sm:pt-4">
      <span class="block text-sm font-700 text-#fffaf1">입 모양</span>
      <span class="mt-1 block text-xs leading-5 text-#a99fac">
        발음별 패치의 위치와 얼굴 이음새를 검사합니다.
      </span>
      <select
        class="mt-2 h-10 w-full rounded-3 border border-white/12 bg-#211a24 px-3 text-sm text-#fffaf1"
        onChange={(event) => props.onVisemeChange(event.currentTarget.value as PViseme)}
        value={props.viseme}
      >
        <For each={P_VISEMES}>
          {(viseme) => <option value={viseme}>{VISEME_LABELS[viseme]}</option>}
        </For>
      </select>
    </label>

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
  const [sceneStyle, setSceneStyle] = createSignal<PSceneStyle>('original')
  const [controlsExpanded, setControlsExpanded] = createSignal(true)
  const [headVisible, setHeadVisible] = createSignal(true)
  const [handsVisible, setHandsVisible] = createSignal(true)
  const [animationEnabled, setAnimationEnabled] = createSignal(true)
  const [eyeMode, setEyeMode] = createSignal<PEyeMode>('auto')
  const [eyesVisible, setEyesVisible] = createSignal(true)
  const [mouthVisible, setMouthVisible] = createSignal(true)
  const [referenceOpacity, setReferenceOpacity] = createSignal(0)
  const [viseme, setViseme] = createSignal<PViseme>('rest')
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
    setMouthVisible(true)
    setHandsVisible(true)
    setReferenceOpacity(0)
    setViseme('rest')
  }
  const handleShowAll = () => {
    setHeadVisible(true)
    setEyesVisible(true)
    setMouthVisible(true)
    setHandsVisible(true)
  }
  const handleHideAll = () => {
    setHeadVisible(false)
    setEyesVisible(false)
    setMouthVisible(false)
    setHandsVisible(false)
  }

  return (
    <section class="relative h-dvh w-full overflow-hidden bg-#17130f">
      <figure aria-label={selectedScene().label} class="absolute inset-0 m-0" role="img">
        <PLayerReviewCanvas
          activity={selectedScene().activity}
          animationEnabled={animationEnabled()}
          eyeMode={eyeMode()}
          eyesVisible={eyesVisible()}
          fallback={
            <div class="grid h-full place-items-center text-sm text-#a99fac">PixiJS 준비 중</div>
          }
          handsVisible={handsVisible()}
          headVisible={headVisible()}
          gaze={selectedScene().gaze}
          mouthVisible={mouthVisible()}
          referenceOpacity={referenceOpacity()}
          sceneId={selectedScene().id}
          sceneStyle={sceneStyle()}
          time={selectedScene().time}
          viseme={viseme()}
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
            Pomofi로 →
          </A>
        </div>
        <p class="mb-0 mt-1 text-xs text-#bdb2c4">1672 × 941 · 분리 레이어</p>
      </header>

      <Show
        fallback={
          <button
            aria-controls="layer-review-controls"
            aria-expanded="false"
            aria-label="레이어 패널 확대"
            class={cx(
              PANEL_CLASSES,
              'absolute bottom-3 right-3 grid size-12 place-items-center text-#f2d3a7',
              'hover:bg-#211a24/92 hover:text-white sm:bottom-6 sm:right-6',
            )}
            onClick={() => setControlsExpanded(true)}
            title="레이어 패널 확대"
            type="button"
          >
            <span aria-hidden="true" class="i-tabler-layout-sidebar-right-expand size-5" />
          </button>
        }
        when={controlsExpanded()}
      >
        <ReviewControls
          animationEnabled={animationEnabled()}
          eyeMode={eyeMode()}
          eyesVisible={eyesVisible()}
          handsVisible={handsVisible()}
          headVisible={headVisible()}
          mouthVisible={mouthVisible()}
          onAnimationChange={setAnimationEnabled}
          onCollapse={() => setControlsExpanded(false)}
          onEyesChange={setEyesVisible}
          onEyeModeChange={setEyeMode}
          onHandsChange={setHandsVisible}
          onHeadChange={setHeadVisible}
          onHideAll={handleHideAll}
          onMouthChange={setMouthVisible}
          onReferenceChange={handleReferenceChange}
          onSceneStyleChange={setSceneStyle}
          onShowAll={handleShowAll}
          onVisemeChange={setViseme}
          referenceOpacity={referenceOpacity()}
          referencePercentage={referencePercentage()}
          sceneStyle={sceneStyle()}
          viseme={viseme()}
        />
      </Show>
    </section>
  )
}
