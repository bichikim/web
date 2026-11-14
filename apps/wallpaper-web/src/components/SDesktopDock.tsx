import {SIcon} from './SIcon'

export const SDesktopDock = () => (
  <div
    aria-hidden="true"
    class="pointer-events-none absolute bottom-[3%] left-1/2 flex -translate-x-1/2 items-end
      gap-[clamp(3px,0.6vw,9px)] rounded-[clamp(8px,1.6dvh,20px)]
      border border-solid border-white/60 bg-white/35 px-[clamp(5px,0.8vw,12px)]
      pb-[clamp(5px,0.8dvh,10px)] pt-[clamp(4px,0.6dvh,8px)]
      shadow-[0_5px_18px_#25232c25] backdrop-blur-xl"
  >
    <span class="desktop-dock-icon overflow-hidden bg-gradient-to-r from-[#91d5ff] to-[#4397ed]">
      <svg viewBox="0 0 40 40" class="h-full w-full" fill="none">
        <path d="M22 0H40V40H21L24 23H18L22 0Z" fill="#d9f0ff" />
        <path d="M11 12V15M29 12V15M9 26Q20 34 31 26" stroke="#244968" stroke-width="2" />
      </svg>
    </span>
    <span class="desktop-dock-icon bg-gradient-to-br from-[#6988b5] to-[#293b60] text-white">
      <SIcon name="grid" class="h-[64%] w-[64%]" />
    </span>
    <span class="desktop-dock-icon bg-white">
      <svg viewBox="0 0 40 40" class="h-full w-full">
        <circle cx="20" cy="20" r="16" fill="#50b8f4" />
        <circle cx="20" cy="20" r="13" fill="none" stroke="white" stroke-dasharray="1 3" />
        <path d="M26 10L22 22L14 30L18 18Z" fill="white" />
        <path d="M26 10L22 22L18 18Z" fill="#ed656c" />
      </svg>
    </span>
    <span class="desktop-dock-icon relative overflow-hidden bg-[#fffdf3]">
      <span class="absolute inset-x-0 top-0 h-[28%] bg-[#f5cd60]" />
      <span class="absolute inset-x-[18%] top-[45%] h-px bg-[#b9b5aa] shadow-[0_5px_0_#b9b5aa]" />
    </span>
    <span class="desktop-dock-icon bg-gradient-to-b from-[#ff8099] to-[#e9426a] text-white">
      <SIcon name="music" class="h-[66%] w-[66%]" />
    </span>
    <span class="desktop-dock-icon relative bg-[#f7f3ff]">
      <img src="/favicon.png" alt="" class="h-[86%] w-[86%] object-contain" />
      <span class="absolute -bottom-[4px] left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-ink/70" />
    </span>
    <span class="mx-0.5 h-[clamp(18px,3.2dvh,40px)] w-px self-center bg-ink/15" />
    <span class="desktop-dock-icon bg-white/50 text-[#737d8c]">
      <svg viewBox="0 0 32 32" class="h-[75%] w-[75%]" fill="none" stroke="currentColor">
        <path d="M7 9H25M12 6H20M9 9L11 27H21L23 9M14 13V23M18 13V23" stroke-width="2" />
      </svg>
    </span>
  </div>
)
