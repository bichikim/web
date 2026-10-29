import {Show} from 'solid-js'

interface SStoryPrintProps {
  /** Light print on the dark color plane. */
  readonly light?: boolean
  /** Halftone omits edge ornaments and leaves most of the surface clear; defaults to full. */
  readonly variant?: 'full' | 'halftone'
}

/** One continuous screen-print surface, rather than two cropped edge patterns. */
export const SStoryPrint = (props: SStoryPrintProps) => (
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 overflow-hidden text-ink"
    classList={{'text-[#d5c4ee]!': props.light === true}}
  >
    <Show when={props.variant !== 'halftone'}>
      <div
        class="absolute inset-0 opacity-40
      [background-image:linear-gradient(150deg,transparent_45%,#accfe6_45%,#accfe6_52%,transparent_52%)]"
      />
    </Show>
    <div
      class="story-print-dots absolute inset-0"
      classList={{
        'opacity-45 [mask-image:linear-gradient(to_right,#000,transparent_40%)]!':
          props.variant === 'halftone',
      }}
    />
    <Show when={props.variant !== 'halftone'}>
      <svg
        viewBox="0 0 600 110"
        class="absolute left-0 top-[15%] h-auto w-[65%]"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M0 0H600L510 110H150L190 65H0ZM8 18H190L170 43H512L554 18H575L520 55H148L176 30H8Z"
        />
      </svg>
      <svg
        viewBox="0 0 600 110"
        class="absolute bottom-[15%] right-0 h-auto w-[48%] rotate-180"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M0 0H600L510 110H150L190 65H0ZM8 18H190L170 43H512L554 18H575L520 55H148L176 30H8Z"
        />
      </svg>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        class="absolute right-[8%] top-[12%] h-[clamp(12px,2.5dvh,20px)] w-[clamp(12px,2.5dvh,20px)]
        stroke-current [stroke-width:3]"
      >
        <path d="M4 20H36M20 4V36" />
      </svg>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        class="absolute bottom-[12%] left-[8%] h-[clamp(12px,2.5dvh,20px)] w-[clamp(12px,2.5dvh,20px)]
        stroke-current [stroke-width:3]"
      >
        <path d="M4 20H36M20 4V36" />
      </svg>
    </Show>
  </div>
)
