import {For} from 'solid-js'
import {P_VISEMES, type PViseme} from '../../features/lip-sync/index'
import {VISEME_LABELS} from './shared'

export const VisemePicker = (props: {
  readonly onChange: (viseme: PViseme) => void
  readonly viseme: PViseme
}) => (
  <label class="mt-3 block border-t border-white/8 pt-3 sm:mt-4 sm:pt-4">
    <span class="block text-sm font-700 text-#fffaf1">입 모양</span>
    <span class="mt-1 block text-xs leading-5 text-#a99fac">
      발음별 패치의 위치와 얼굴 이음새를 검사합니다.
    </span>
    <select
      class="mt-2 h-10 w-full rounded-3 border border-white/12 bg-#211a24 px-3 text-sm text-#fffaf1"
      onChange={(event) => props.onChange(event.currentTarget.value as PViseme)}
      value={props.viseme}
    >
      <For each={P_VISEMES}>
        {(viseme) => <option value={viseme}>{VISEME_LABELS[viseme]}</option>}
      </For>
    </select>
  </label>
)
