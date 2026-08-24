import {For, Show} from 'solid-js'
import {type SupertonicVoiceChunkResult} from '../../features/supertonic/index'
import {MILLISECONDS_PER_SECOND} from './shared'

interface AudioChunksProps {
  readonly chunks: ReadonlyArray<SupertonicVoiceChunkResult>
}

export const AudioChunks = (props: AudioChunksProps) => (
  <Show when={props.chunks.length > 0}>
    <div class="grid gap-3">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-650 text-#eee5ef">실시간 생성 청크</span>
        <span class="text-xs text-#9f93a7">완성되는 순서대로 자동 재생</span>
      </div>
      <div class="grid gap-3 xs:grid-cols-2">
        <For each={props.chunks}>
          {(chunk) => (
            <div class="grid gap-2 rounded-4 border border-white/8 bg-white/3 p-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-650 text-#d9cfdd">
                  AI 생성 음성 · 청크 {chunk.index + 1}/{chunk.total}
                </span>
                <span class="text-#8f8297">
                  {(chunk.generationTime / MILLISECONDS_PER_SECOND).toFixed(1)}초
                </span>
              </div>
              <audio class="h-9 w-full" controls preload="metadata" src={chunk.url} />
            </div>
          )}
        </For>
      </div>
    </div>
  </Show>
)
