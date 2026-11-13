import {SMusicPlayer} from './SMusicPlayer'
import {SIcon} from './SIcon'

interface SPlaygroundHeaderProps {
  /** Disable header controls while a page transition owns input. Omitted keeps controls interactive. */
  readonly inert?: boolean
}

export const SPlaygroundHeader = (props: SPlaygroundHeaderProps) => (
  <header
    inert={props.inert}
    class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between
          gap-[clamp(0.25rem,1.5vw,0.5rem)] px-[clamp(0.75rem,4vw,1.25rem)] pt-5 sm:px-8 sm:pt-7"
  >
    <h1
      class="flex h-11 shrink-0 items-baseline gap-2.5 rounded-full bg-white/80
            px-[clamp(0.75rem,3vw,1rem)] py-2 shadow-[0_8px_30px_-12px_#35244745] backdrop-blur-md"
    >
      <span class="text-7 font-800 leading-none tracking-[-0.09em]">
        poffo<span class="text-violet">.</span>
      </span>
      <span class="hidden text-[9px] font-600 tracking-[0.08em] text-muted sm:inline">
        WALLPAPER
      </span>
    </h1>
    <div class="flex min-w-0 flex-1 items-center justify-end gap-[clamp(0.25rem,1.5vw,0.5rem)] sm:gap-3">
      <SMusicPlayer />
      <button
        type="button"
        popovertarget="app-download"
        aria-label="다운로드"
        class="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center gap-3 rounded-full
            border-0 bg-ink p-0 text-xs font-550 text-white shadow-[0_8px_30px_-12px_#35244745]
            hover:bg-violet sm:w-auto sm:px-5"
      >
        <span class="hidden sm:inline">다운로드</span>
        <SIcon name="download" class="h-5.5 w-5.5" />
      </button>
    </div>
  </header>
)
