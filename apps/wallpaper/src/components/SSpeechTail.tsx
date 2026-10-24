import {Show} from 'solid-js'
import type {SpeechTail} from '../features/speech'

interface SSpeechTailProps {
  readonly value?: SpeechTail | null
}
export const SSpeechTail = (props: SSpeechTailProps) => (
  <Show when={props.value}>
    {(tail) => (
      <span
        aria-hidden="true"
        data-edge={tail().edge}
        class="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45
          border-0 border-solid bg-inherit [border-color:inherit]
          [left:var(--tail-x)] [top:var(--tail-y)]
          data-[edge=top]:border-l data-[edge=top]:border-t
          data-[edge=bottom]:border-b data-[edge=bottom]:border-r
          data-[edge=left]:border-b data-[edge=left]:border-l
          data-[edge=right]:border-r data-[edge=right]:border-t"
        style={{'--tail-x': `${tail().x}px`, '--tail-y': `${tail().y}px`}}
      />
    )}
  </Show>
)
