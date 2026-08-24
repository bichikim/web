import {For, Show} from 'solid-js'
import {getSupertonicModel, type SupertonicVoiceResult} from '../../features/supertonic/index'
import {MILLISECONDS_PER_SECOND} from './shared'

interface AudioResultsProps {
  readonly results: ReadonlyArray<SupertonicVoiceResult>
}

export const AudioResults = (props: AudioResultsProps) => (
  <Show when={props.results.length > 0}>
    <div class="grid gap-3 xs:grid-cols-2">
      <For each={props.results}>
        {(result) => {
          const model = getSupertonicModel(result.modelId)

          return (
            <div class="grid gap-3 rounded-4 border border-#9ed6bb/20 bg-#9ed6bb/6 p-4">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="font-650 text-#b8e8d0">{model.label} · AI 생성 음성</span>
                <span class="text-xs text-#9fbaad">
                  {(result.generationTime / MILLISECONDS_PER_SECOND).toFixed(1)}초
                </span>
              </div>
              <audio class="h-10 w-full" controls preload="metadata" src={result.url} />
              <a
                class="justify-self-end text-xs font-650 text-#b8e8d0 underline"
                download={`pomo-voice-${model.id}.wav`}
                href={result.url}
              >
                WAV 다운로드
              </a>
            </div>
          )
        }}
      </For>
    </div>
  </Show>
)
