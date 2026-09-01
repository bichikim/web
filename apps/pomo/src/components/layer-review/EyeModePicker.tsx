import {type PEyeMode} from '../../features/focus-room-animation/index'
import {PSelect} from '../PSelect'

const EYE_MODES = ['auto', 'open', 'half', 'closed'] as const satisfies ReadonlyArray<PEyeMode>

const EYE_MODE_LABELS: Readonly<Record<PEyeMode, string>> = {
  auto: '자동 깜박임',
  closed: '완전히 감은 눈',
  half: '반쯤 감은 눈',
  open: '열린 눈',
}
const EYE_MODE_OPTIONS = EYE_MODES.map((eyeMode) => ({
  label: EYE_MODE_LABELS[eyeMode],
  value: eyeMode,
}))

export const EyeModePicker = (props: {
  readonly eyeMode: PEyeMode
  readonly onChange: (eyeMode: PEyeMode) => void
}) => (
  <PSelect
    class="mt-3 border-t border-white/8 pt-3 sm:mt-4 sm:pt-4"
    description="자동 움직임이나 눈 프레임 한 단계를 고정해서 검사합니다."
    label="눈 깜박임 단계"
    onChange={props.onChange}
    options={EYE_MODE_OPTIONS}
    value={props.eyeMode}
  />
)
