import type {JSX} from 'solid-js'
import {
  DEFAULT_OVERLAP_SECONDS,
  DEFAULT_SOUND_VOLUME,
  type SoundLayer,
} from 'src/features/sound-player'

export interface SoundLayerControlsProps {
  readonly layer: SoundLayer
  readonly onChange?: (layer: SoundLayer) => void
}

const PERCENT_SCALE = 100

export const SoundLayerControls = (props: SoundLayerControlsProps) => {
  const handleEnabledChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    props.onChange?.({...props.layer, enabled: event.currentTarget.checked})
  }
  const handleLoopChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    props.onChange?.({...props.layer, loop: event.currentTarget.checked})
  }
  const handleOverlapChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    props.onChange?.({...props.layer, overlapSeconds: event.currentTarget.valueAsNumber})
  }
  const handleVolumeChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    props.onChange?.({...props.layer, volume: event.currentTarget.valueAsNumber})
  }
  return (
    <div class="grid gap-3 rounded-xl border border-solid border-#60566b p-4">
      <strong class="break-all">{props.layer.title ?? props.layer.id}</strong>
      <div class="flex flex-wrap gap-5">
        <label class="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={props.layer.enabled !== false}
            disabled={props.onChange === undefined}
            onChange={handleEnabledChange}
          />
          소리 켜기
        </label>
        <label class="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={props.layer.loop !== false}
            disabled={props.onChange === undefined}
            onChange={handleLoopChange}
          />
          반복 재생
        </label>
      </div>
      <label class="grid gap-2">
        연결 시간 (초)
        <input
          aria-label={`${props.layer.title ?? props.layer.id} 연결 시간`}
          class="min-h-11 rounded-xl border border-solid border-#60566b bg-transparent px-3 text-inherit"
          type="number"
          min="0"
          step="0.1"
          value={props.layer.overlapSeconds ?? DEFAULT_OVERLAP_SECONDS}
          disabled={props.onChange === undefined || props.layer.loop === false}
          onChange={handleOverlapChange}
        />
        <span class="text-sm text-#bdb2c4">
          끝과 다음 시작을 겹쳐 재생합니다. 0초는 일반 반복이며, 최대 음원 길이의 절반까지
          가능합니다.
        </span>
      </label>
      <label class="grid gap-2">
        음량 {Math.round((props.layer.volume ?? DEFAULT_SOUND_VOLUME) * PERCENT_SCALE)}%
        <input
          aria-label={`${props.layer.title ?? props.layer.id} 음량`}
          class="min-h-11 w-full accent-#b8e8d0"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={props.layer.volume ?? DEFAULT_SOUND_VOLUME}
          disabled={props.onChange === undefined}
          onInput={handleVolumeChange}
        />
      </label>
    </div>
  )
}
