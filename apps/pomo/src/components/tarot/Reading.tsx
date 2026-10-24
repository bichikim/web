import * as m from '@paraglide/message'
import {Show} from 'solid-js'
import type {TarotSpeechController} from '../../features/tarot'
import {SpeechControls} from './SpeechControls'

export interface ReadingProps {
  readonly generating?: boolean
  readonly output: string
  readonly speech?: TarotSpeechController
  readonly visible?: boolean
}

export const Reading = (props: ReadingProps) => (
  <Show when={props.visible || props.generating || props.output.length > 0}>
    <section aria-busy={props.generating} class="grid min-w-0 grid-cols-1 gap-4">
      <h3
        aria-label={m.tarot_reading_title()}
        class="m-0 flex items-center justify-center gap-3 text-[#d8b97e]"
      >
        <span
          aria-hidden="true"
          class="h-px w-8 bg-gradient-to-r from-transparent to-[#d8b97e80] sm:w-16"
        />
        <span aria-hidden="true" class="h-12 w-9 inline-flex shrink-0 items-center justify-center">
          <span class="i-tabler-moon-stars relative size-7 overflow-hidden">
            <Show when={props.generating}>
              <span
                class="absolute inset-[-50%] animate-glint
                  bg-[linear-gradient(135deg,transparent_30%,#fff9e8_48%,#fff_50%,#fff9e8_52%,transparent_70%)]
                  [animation-timing-function:ease-in-out] motion-reduce:hidden"
              />
            </Show>
          </span>
        </span>
        <span
          aria-hidden="true"
          class="h-px w-8 bg-gradient-to-l from-transparent to-[#d8b97e80] sm:w-16"
        />
      </h3>
      <Show when={props.generating}>
        <span role="status" class="sr-only">
          {m.tarot_generating()}
        </span>
      </Show>
      <Show when={props.generating || props.output.length > 0}>
        <div class="relative min-w-0">
          <div
            class="min-h-20 min-w-0 whitespace-pre-wrap break-words rounded-4 border border-solid border-[#96855e40]
              bg-content-surface
              p-5 pt-7 text-sm leading-8 text-foreground sm:p-6 sm:pt-7 sm:text-base"
          >
            {props.output}
          </div>
          <Show when={props.speech}>
            {(speech) => (
              <SpeechControls
                generating={props.generating}
                speech={speech()}
                class="absolute right-4 top-0 -translate-y-1/2 sm:right-5"
              />
            )}
          </Show>
        </div>
      </Show>
    </section>
  </Show>
)
