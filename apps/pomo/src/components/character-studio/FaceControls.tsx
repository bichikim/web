import {For} from 'solid-js'
import {FACE_CONTROLS, type FaceSettings} from './face-deformation'

interface FaceControlsProps {
  readonly value: FaceSettings
  readonly disabled?: boolean
  readonly onChange: (value: FaceSettings) => void
}
const DECIMAL_PLACES = 3

export const FaceControls = (props: FaceControlsProps) => (
  <fieldset
    class="m-0 grid gap-5 rounded-7 border border-white/10 bg-#171f28/88 p-5 text-#d9e1e6 disabled:opacity-50"
    disabled={props.disabled}
  >
    <legend class="px-2 text-lg font-750">얼굴 변형</legend>
    <For each={FACE_CONTROLS}>
      {(control) => (
        <label class="grid gap-3 text-sm">
          <span class="flex items-center justify-between gap-3">
            {control.label}
            <output class="rounded-2 bg-white/5 px-3 py-1 tabular-nums">
              {(props.value[control.id] ?? control.initial).toFixed(DECIMAL_PLACES)}
            </output>
          </span>
          <input
            aria-label={control.label}
            class="w-full accent-#a9e5d2"
            max="1"
            min={control.min}
            onInput={(event) =>
              props.onChange({...props.value, [control.id]: event.currentTarget.valueAsNumber})
            }
            step="0.001"
            type="range"
            value={props.value[control.id] ?? control.initial}
          />
        </label>
      )}
    </For>
    <button
      class="min-h-11 rounded-3 border border-white/15 bg-transparent text-sm"
      onClick={() => props.onChange({})}
      type="button"
    >
      얼굴 변형 초기화
    </button>
  </fieldset>
)
