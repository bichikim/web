import {P_VISEMES, type PViseme} from '../../features/lip-sync/index'
import {PSelect} from '../PSelect'
import {VISEME_LABELS} from './shared'

const VISEME_OPTIONS = P_VISEMES.map((viseme) => ({
  label: VISEME_LABELS[viseme],
  value: viseme,
}))

export const VisemePicker = (props: {
  readonly onChange: (viseme: PViseme) => void
  readonly viseme: PViseme
}) => (
  <PSelect
    class="mt-3 border-t border-white/8 pt-3 sm:mt-4 sm:pt-4"
    description="발음별 패치의 위치와 얼굴 이음새를 검사합니다."
    label="입 모양"
    onChange={props.onChange}
    options={VISEME_OPTIONS}
    value={props.viseme}
  />
)
