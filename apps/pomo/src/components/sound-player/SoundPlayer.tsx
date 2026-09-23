import {For, Show} from 'solid-js'
import {type SoundLayer, useSoundPlayer} from 'src/features/sound-player'
import {SoundLayerControls} from './SoundLayerControls'

export interface SoundPlayerProps {
  readonly layers: readonly SoundLayer[]
  readonly onLayerChange?: (layer: SoundLayer) => void
}
const BUTTON =
  'min-h-11 rounded-xl border border-solid border-#60566b bg-transparent px-4 text-inherit disabled:opacity-40'
const STATUS = {
  error: '재생 실패',
  idle: '정지',
  loading: '불러오는 중',
  paused: '일시정지',
  playing: '재생 중',
}

/** 효과음의 지속 재생과 반복·혼합 설정을 제공한다. */
export const SoundPlayer = (props: SoundPlayerProps) => {
  const player = useSoundPlayer({layers: () => props.layers})
  const playDisabled = () => {
    const status = player.status()
    return props.layers.length === 0 || status === 'playing' || status === 'loading'
  }
  return (
    <section aria-label="효과음 플레이어" class="grid gap-5">
      <div class="flex flex-wrap items-center gap-3">
        <button
          class={BUTTON}
          disabled={playDisabled()}
          onClick={() => player.play()}
          type="button"
        >
          {player.status() === 'paused' ? '이어서 재생' : '전체 재생'}
        </button>
        <button
          class={BUTTON}
          disabled={player.status() !== 'playing'}
          onClick={player.pause}
          type="button"
        >
          일시정지
        </button>
        <button
          class={BUTTON}
          disabled={player.status() === 'idle'}
          onClick={player.stop}
          type="button"
        >
          정지
        </button>
        <span role="status">{STATUS[player.status()]}</span>
      </div>
      <Show when={player.error()}>
        <p role="alert" class="m-0 text-#ffb4c5">
          {player.error()}
        </p>
      </Show>
      <For each={props.layers}>
        {(layer) => <SoundLayerControls layer={layer} onChange={props.onLayerChange} />}
      </For>
    </section>
  )
}
