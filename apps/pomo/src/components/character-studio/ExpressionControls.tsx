import {For} from 'solid-js'
import {DEFAULT_EXPRESSIONS, type ExpressionSettings} from './expressions'

interface ExpressionControlsProps {
  readonly value: ExpressionSettings
  readonly disabled?: boolean
  readonly onChange: (value: ExpressionSettings) => void
}

const EMOTIONS = [
  {label: '기본', value: ''},
  {label: '미소', value: 'Fun'},
  {label: '기쁨', value: 'Joy'},
  {label: '화남', value: 'Angry'},
  {label: '슬픔', value: 'Sorrow'},
  {label: '놀람', value: 'Surprised'},
]
const MOUTHS = [
  {label: '기본', value: ''},
  {label: '아', value: 'A'},
  {label: '이', value: 'I'},
  {label: '우', value: 'U'},
  {label: '에', value: 'E'},
  {label: '오', value: 'O'},
]
const RANGES = [
  {key: 'emotionWeight', label: '표정 강도'},
  {key: 'mouthWeight', label: '입 모양 강도'},
  {key: 'blink', label: '눈 감기'},
] as const
const PERCENT_SCALE = 100

export const ExpressionControls = (props: ExpressionControlsProps) => (
  <fieldset
    class="m-0 grid gap-4 rounded-7 border border-white/10 bg-#171f28/88 p-5 text-#d9e1e6 disabled:opacity-50"
    disabled={props.disabled}
  >
    <legend class="px-2 text-lg font-750">표정과 입 모양</legend>
    <label class="grid gap-2 text-sm">
      표정
      <select
        class="min-h-11 rounded-3 border border-white/15 bg-#111820 px-3"
        onChange={(event) => props.onChange({...props.value, emotion: event.currentTarget.value})}
        value={props.value.emotion}
      >
        <For each={EMOTIONS}>{(item) => <option value={item.value}>{item.label}</option>}</For>
      </select>
    </label>
    <label class="grid gap-2 text-sm">
      입 모양
      <select
        class="min-h-11 rounded-3 border border-white/15 bg-#111820 px-3"
        onChange={(event) => props.onChange({...props.value, mouth: event.currentTarget.value})}
        value={props.value.mouth}
      >
        <For each={MOUTHS}>{(item) => <option value={item.value}>{item.label}</option>}</For>
      </select>
    </label>
    <For each={RANGES}>
      {(item) => (
        <label class="grid gap-2 text-sm">
          {item.label} · {Math.round(props.value[item.key] * PERCENT_SCALE)}%
          <input
            aria-label={item.label}
            class="w-full accent-#a9e5d2"
            max="1"
            min="0"
            onInput={(event) =>
              props.onChange({...props.value, [item.key]: event.currentTarget.valueAsNumber})
            }
            step="0.01"
            type="range"
            value={props.value[item.key]}
          />
        </label>
      )}
    </For>
    <button
      class="min-h-11 rounded-3 border border-white/15 bg-transparent text-sm"
      onClick={() => props.onChange({...DEFAULT_EXPRESSIONS})}
      type="button"
    >
      표정과 입 모양 초기화
    </button>
  </fieldset>
)
