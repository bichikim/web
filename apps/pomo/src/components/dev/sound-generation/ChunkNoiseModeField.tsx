import type {ChunkNoiseMode} from 'src/features/sound-generation'

export interface ChunkNoiseModeFieldProps {
  readonly disabled?: boolean
  readonly onChange: (mode: ChunkNoiseMode) => void
  readonly value: ChunkNoiseMode
}

export function ChunkNoiseModeField(props: ChunkNoiseModeFieldProps) {
  return (
    <fieldset disabled={props.disabled} class="mt-4 grid basis-full gap-2 border-0 p-0 text-sm">
      <legend class="font-700">청크 노이즈 방식</legend>
      <label class="inline-flex min-h-11 items-center gap-2">
        <input
          aria-label="연속 노이즈"
          checked={props.value === 'continuous'}
          name="chunk-noise-mode"
          onChange={() => props.onChange('continuous')}
          type="radio"
          value="continuous"
        />
        연속 노이즈 (권장)
      </label>
      <label class="inline-flex min-h-11 items-center gap-2">
        <input
          aria-label="청크마다 같은 패턴 반복"
          checked={props.value === 'repeat'}
          name="chunk-noise-mode"
          onChange={() => props.onChange('repeat')}
          type="radio"
          value="repeat"
        />
        청크마다 같은 패턴 반복
      </label>
      <p class="m-0 text-xs leading-5 text-#bdb2c4">
        연속 노이즈는 전체 생성 흐름을 이어 쓰고, 같은 패턴 반복은 청크마다 같은 기준으로
        시작합니다.
      </p>
    </fieldset>
  )
}
