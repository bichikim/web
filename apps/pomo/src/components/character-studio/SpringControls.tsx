import {DEFAULT_SPRING, type SpringSettings} from './spring'

const PERCENT_SCALE = 100

interface SpringControlsProps {
  readonly value: SpringSettings
  readonly onChange: (value: SpringSettings) => void
  readonly disabled?: boolean
}

export const SpringControls = (props: SpringControlsProps) => (
  <section class="grid gap-4 rounded-7 border border-white/10 bg-#171f28/88 p-5 text-#d9e1e6">
    <h2 class="m-0 text-lg font-750">Spring 비율 비교</h2>
    <p class="m-0 text-sm leading-6 text-#9ba8b1">
      원본은 약 3.5등신입니다. 체형 보정은 머리를 줄이고 몸을 늘린 비교 시안이며, Pomo 2D의 확정
      비율은 아닙니다.
    </p>
    <label class="grid gap-3 text-sm">
      체형 보정 · {Math.round(props.value.proportions * PERCENT_SCALE)}%
      <input
        aria-label="Spring 체형 보정"
        class="w-full accent-#a9e5d2"
        type="range"
        min="0"
        max="1"
        step="0.01"
        disabled={props.disabled}
        value={props.value.proportions}
        onInput={(event) =>
          props.onChange({...props.value, proportions: event.currentTarget.valueAsNumber})
        }
      />
    </label>
    <div class="grid grid-cols-2 gap-2">
      <button
        class="min-h-11 rounded-3 border border-white/15 bg-transparent text-sm disabled:opacity-40"
        type="button"
        disabled={props.disabled}
        onClick={() => props.onChange({...props.value, proportions: 0})}
      >
        원본 비율
      </button>
      <button
        class="min-h-11 rounded-3 border border-white/15 bg-transparent text-sm disabled:opacity-40"
        type="button"
        disabled={props.disabled}
        onClick={() => props.onChange({...props.value, proportions: 1})}
      >
        체형 보정안
      </button>
    </div>
    <label class="grid gap-3 text-sm">
      얼굴 폭 좁힘 · {Math.round(props.value.faceWidth * PERCENT_SCALE)}%
      <input
        aria-label="Spring 얼굴 폭 좁힘"
        class="w-full accent-#a9e5d2"
        type="range"
        min="0"
        max="1"
        step="0.01"
        disabled={props.disabled}
        value={props.value.faceWidth}
        onInput={(event) =>
          props.onChange({...props.value, faceWidth: event.currentTarget.valueAsNumber})
        }
      />
    </label>
    <button
      class="min-h-11 rounded-3 border border-white/15 bg-transparent text-sm disabled:opacity-40"
      type="button"
      disabled={props.disabled}
      onClick={() => props.onChange({...DEFAULT_SPRING})}
    >
      Spring 설정 초기화
    </button>
    <p class="m-0 text-sm leading-6 text-#9ba8b1">
      체형 비교용 모델입니다. 표정·입모양과 몸 동작은 아직 연결하지 않았습니다.
    </p>
    <a
      class="text-sm text-#a9e5d2 underline"
      href="https://studio.blender.org/characters/spring/v1/"
      target="_blank"
      rel="noreferrer"
    >
      Spring Rig · Blender Foundation · CC-BY 4.0 · 체형·재질 수정
    </a>
  </section>
)
