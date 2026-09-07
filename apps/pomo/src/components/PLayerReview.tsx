import * as m from '@paraglide/message'

import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, Show} from 'solid-js'

import {
  FOCUS_ROOM_SCENES,
  type PEyeMode,
  type PSceneCatalogEntry,
  type PSceneId,
  type PSceneStyle,
} from '../features/focus-room-animation'
import type {PReviewMouthFrame} from '../features/focus-room-layer-review/scene-renderer'
import {type PViseme} from '../features/lip-sync'
import {PLayerReviewViewport} from './layer-review/Viewport'
import {ReviewControls} from './layer-review/Controls'
import {ScenePicker} from './layer-review/ScenePicker'
import {PANEL_CLASSES} from './layer-review/shared'

const PERCENT_SCALE = 100
const INITIAL_SCENE_ID: PSceneId = 'day-reading-focused'

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
  const [mouthFrame, setMouthFrame] = createSignal<PReviewMouthFrame | null>(null)
  const [mouthPositionComparison, setMouthPositionComparison] = createSignal(false)
  const [referenceOpacity, setReferenceOpacity] = createSignal(0)
  const [viseme, setViseme] = createSignal<PViseme>('rest')
  const selectedScene = createMemo<PSceneCatalogEntry>(() => {
    const scene = FOCUS_ROOM_SCENES.find((candidate) => candidate.id === selectedId())

    if (scene === undefined) {
      throw new Error(`Missing preview scene: ${selectedId()}`)
    }

    return scene
  })
  const handleSelect = (id: PSceneId) => {
    setSelectedId(id)
    setHeadVisible(true)
    setEyesVisible(true)
    setMouthVisible(true)
    setHandsVisible(true)
    setReferenceOpacity(0)
    setViseme('rest')
    setMouthFrame(null)
  }
  const setAllLayersVisible = (visible: boolean) => {
    setHeadVisible(visible)
    setEyesVisible(visible)
    setMouthVisible(visible)
    setHandsVisible(visible)
  }
  const handleMouthFrameChange = (nextMouthFrame: PReviewMouthFrame | null) => {
    setMouthFrame(nextMouthFrame)

    if (nextMouthFrame !== null) {
      setSelectedId(`${selectedScene().time}-${selectedScene().activity}-user`)
      setSceneStyle('original')
      setHeadVisible(true)
      setMouthVisible(true)
    }
  }

  return (
    <section class="relative h-dvh w-full overflow-hidden bg-#17130f">
      <figure aria-label={selectedScene().label} class="absolute inset-0 m-0" role="img">
        <PLayerReviewViewport
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
          mouthFrame={mouthFrame()}
          mouthPositionComparison={mouthPositionComparison()}
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
        <p class="m-0 text-[0.625rem] font-750 tracking-[0.2em] text-#e8c795 uppercase">
          PixiJS 12 scene preview
        </p>
        <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <h1 class="m-0 text-lg font-800 tracking--0.03em text-#fffaf1 sm:text-2xl">
            {selectedScene().label}
          </h1>
          <A class="text-xs font-700 text-#d7c7b3 no-underline hover:text-white" href="/">
            {m.app_return()} <span aria-hidden="true">→</span>
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
          mouthFrame={mouthFrame()}
          mouthPositionComparison={mouthPositionComparison()}
          onAnimationChange={setAnimationEnabled}
          onCollapse={() => setControlsExpanded(false)}
          onEyesChange={setEyesVisible}
          onEyeModeChange={setEyeMode}
          onHandsChange={setHandsVisible}
          onHeadChange={setHeadVisible}
          onHideAll={() => setAllLayersVisible(false)}
          onMouthChange={setMouthVisible}
          onMouthFrameChange={handleMouthFrameChange}
          onMouthPositionComparisonChange={setMouthPositionComparison}
          onReferenceChange={setReferenceOpacity}
          onSceneStyleChange={setSceneStyle}
          onShowAll={() => setAllLayersVisible(true)}
          onVisemeChange={(nextViseme) => {
            setViseme(nextViseme)
            setMouthFrame(null)
          }}
          referenceOpacity={referenceOpacity()}
          referencePercentage={Math.round(referenceOpacity() * PERCENT_SCALE)}
          sceneStyle={sceneStyle()}
          viseme={viseme()}
        />
      </Show>
    </section>
  )
}
