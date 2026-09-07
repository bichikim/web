import {Slider} from '@kobalte/core/slider'
import {cx} from 'class-variance-authority'
import {type PEyeMode, type PSceneStyle} from '../../features/focus-room-animation/index'
import type {PReviewMouthFrame} from '../../features/focus-room-layer-review/scene-renderer'
import {type PViseme} from '../../features/lip-sync/index'
import {EyeModePicker} from './EyeModePicker'
import {LayerToggle} from './LayerToggle'
import {MouthFramePicker} from './MouthFramePicker'
import {PANEL_CLASSES} from './shared'
import {VisemePicker} from './VisemePicker'

const PERCENT_SCALE = 100
const SLIDER_THUMB_CLASSES = [
  'block size-5 -translate-y-[0.4375rem] rounded-full border-2 border-#241b12',
  'bg-#e8c795 outline-none focus-visible:shadow-focus',
].join(' ')

interface ReviewControlsProps {
  readonly animationEnabled: boolean
  readonly eyeMode: PEyeMode
  readonly eyesVisible: boolean
  readonly handsVisible: boolean
  readonly headVisible: boolean
  readonly mouthFrame: PReviewMouthFrame | null
  readonly mouthPositionComparison: boolean
  readonly mouthVisible: boolean
  readonly onAnimationChange: (enabled: boolean) => void
  readonly onCollapse: () => void
  readonly onEyesChange: (visible: boolean) => void
  readonly onEyeModeChange: (eyeMode: PEyeMode) => void
  readonly onHandsChange: (visible: boolean) => void
  readonly onHeadChange: (visible: boolean) => void
  readonly onHideAll: () => void
  readonly onMouthChange: (visible: boolean) => void
  readonly onMouthFrameChange: (mouthFrame: PReviewMouthFrame | null) => void
  readonly onMouthPositionComparisonChange: (enabled: boolean) => void
  readonly onReferenceChange: (value: number) => void
  readonly onSceneStyleChange: (sceneStyle: PSceneStyle) => void
  readonly onShowAll: () => void
  readonly referenceOpacity: number
  readonly referencePercentage: number
  readonly sceneStyle: PSceneStyle
  readonly viseme: PViseme
  readonly onVisemeChange: (viseme: PViseme) => void
}

export const ReviewControls = (props: ReviewControlsProps) => (
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

    <LayerToggle
      checked={props.animationEnabled}
      class="mt-3 border-t border-white/8 pt-3 sm:mt-4 sm:pt-4"
      description="머리 · 머리카락 · 손 랜덤 왕복"
      label="미세 애니메이션"
      onChange={props.onAnimationChange}
    />

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

    <VisemePicker onChange={props.onVisemeChange} viseme={props.viseme} />

    <MouthFramePicker
      mouthFrame={props.mouthFrame}
      mouthPositionComparison={props.mouthPositionComparison}
      onChange={props.onMouthFrameChange}
      onPositionComparisonChange={props.onMouthPositionComparisonChange}
    />

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

    <Slider
      class="mt-3 border-t border-white/8 pt-3 sm:mt-4 sm:pt-4"
      getValueLabel={({values}) => `${Math.round((values[0] ?? 0) * PERCENT_SCALE)}%`}
      maxValue={1}
      minValue={0}
      onChange={(values) => props.onReferenceChange(values[0] ?? 0)}
      step={0.05}
      value={[props.referenceOpacity]}
    >
      <div class="flex items-center justify-between gap-4">
        <Slider.Label class="text-sm font-700 text-#fffaf1">원본 오버레이</Slider.Label>
        <output class="text-xs tabular-nums text-#e8c795">{props.referencePercentage}%</output>
      </div>
      <Slider.Track class="relative mt-3 h-1.5 w-full rounded-full bg-white/15">
        <Slider.Fill class="absolute h-full rounded-full bg-#e8c795" />
        <Slider.Thumb class={SLIDER_THUMB_CLASSES}>
          <Slider.Input aria-hidden="true" />
        </Slider.Thumb>
      </Slider.Track>
      <p class="mb-0 mt-2 text-xs leading-5 text-#a99fac">
        값을 올리면 원본 장면이 위에 겹쳐져 가장자리 차이를 확인할 수 있습니다.
      </p>
    </Slider>
  </aside>
)
