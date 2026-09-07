import {P_MOUTH_TRANSITION_PATHS} from '../../features/focus-room-animation/index'
import type {PReviewMouthFrame} from '../../features/focus-room-layer-review/scene-renderer'
import {P_VISEMES} from '../../features/lip-sync/index'
import {PSelect} from '../PSelect'
import {LayerToggle} from './LayerToggle'
import {VISEME_LABELS} from './shared'

const EARLY_MOUTH_STAGE_POSITION = 1

const MIDDLE_MOUTH_STAGE_POSITION = 2

const LATE_MOUTH_STAGE_POSITION = 3

const getMouthStagePosition = (stage: string, index: number) => {
  if (stage.endsWith('-early')) {
    return EARLY_MOUTH_STAGE_POSITION
  }

  if (stage.endsWith('-middle')) {
    return MIDDLE_MOUTH_STAGE_POSITION
  }

  if (stage.endsWith('-late')) {
    return LATE_MOUTH_STAGE_POSITION
  }

  return index + 1
}

const MOUTH_FRAME_OPTIONS = [
  {label: '전환 애니메이션으로 확인', value: 'animated'},
  ...P_VISEMES.map((viseme) => ({label: VISEME_LABELS[viseme], value: viseme})),
  ...P_MOUTH_TRANSITION_PATHS.flatMap((path) =>
    path.stages.map((stage, index) => ({
      label: `${path.from} → ${path.to} · 중간 ${getMouthStagePosition(stage, index)}`,
      value: stage,
    })),
  ),
] as const satisfies ReadonlyArray<{
  readonly label: string
  readonly value: PReviewMouthFrame | 'animated'
}>

export const MouthFramePicker = (props: {
  readonly mouthFrame: PReviewMouthFrame | null
  readonly mouthPositionComparison: boolean
  readonly onChange: (mouthFrame: PReviewMouthFrame | null) => void
  readonly onPositionComparisonChange: (enabled: boolean) => void
}) => (
  <>
    <PSelect
      class="mt-3 border-t border-white/8 pt-3 sm:mt-4 sm:pt-4"
      description="기본 입과 모든 중간 프레임을 현재 시간대의 사용자 얼굴 위에 한 장씩 고정해서 검사합니다."
      label="개별 입 이미지"
      onChange={(value) => props.onChange(value === 'animated' ? null : value)}
      options={MOUTH_FRAME_OPTIONS}
      value={props.mouthFrame ?? 'animated'}
    />
    <div class="mt-1 border-t border-white/8 pt-1">
      <LayerToggle
        checked={props.mouthPositionComparison}
        description="기본 미소 100% 위에 선택 이미지를 50% 투명도로 겹칩니다."
        label="입 위치 비교"
        onChange={props.onPositionComparisonChange}
      />
    </div>
  </>
)
