import {For} from 'solid-js'
import {type PEyeMode} from '../../features/focus-room-animation/index'

const EYE_MODES = ['auto', 'open', 'half', 'closed'] as const satisfies ReadonlyArray<PEyeMode>

const EYE_MODE_LABELS: Readonly<Record<PEyeMode, string>> = {
  auto: '자동 깜박임',
  closed: '완전히 감은 눈',
  half: '반쯤 감은 눈',
  open: '열린 눈',
}

export const EyeModePicker = (props: {
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
