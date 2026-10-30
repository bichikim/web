import {Show} from 'solid-js'
import {SDesktopDock} from './SDesktopDock'
import {SDesktopSlideshow} from './SDesktopSlideshow'
import {SDesktopWallpaperVideo} from './SDesktopWallpaperVideo'

interface SDesktopPreviewProps {
  /** Display the looping window wallpaper; omitted uses the music-cover album. */
  readonly live?: boolean
  /** Pause the live wallpaper during scene transitions; omitted keeps it playing. */
  readonly playing?: boolean
}

export const SDesktopPreview = (props: SDesktopPreviewProps) => {
  return (
    <section
      aria-label="Poffo Wallpaper 데스크톱 미리보기"
      class="absolute bottom-[9%] left-[6%] w-[88%] max-w-[65dvh]
        sm:left-[13%] sm:w-[74%]"
    >
      <div
        class="relative aspect-[8/5] rounded-t-[clamp(10px,1.5vw,20px)]
          border border-solid border-[#777583] bg-[#25232c] p-[clamp(5px,0.65vw,9px)]
          shadow-[0_24px_60px_-20px_#25232c80]"
      >
        <div class="relative h-full w-full overflow-hidden rounded-[clamp(5px,0.7vw,10px)] bg-lilac">
          <Show when={props.live} fallback={<SDesktopSlideshow />}>
            <SDesktopWallpaperVideo playing={props.playing} />
          </Show>
          <div
            class="absolute inset-x-0 top-0 flex h-[clamp(24px,3dvh,30px)] items-center
              bg-white/45 px-[3%] text-[clamp(7px,1.1dvh,11px)] text-ink backdrop-blur-md"
          >
            <span class="flex items-center gap-1.5 font-700">
              <img src="/favicon.png" alt="" class="h-[1.3em] w-[1.3em] object-contain" />
              Poffo Wallpaper
            </span>
          </div>
          <div
            aria-hidden="true"
            class="pointer-events-none absolute left-1/2 top-0 h-[3%] w-[14%]
              -translate-x-1/2 rounded-b-[5px] bg-[#25232c]"
          />
          <SDesktopDock />
        </div>
      </div>
      <div
        aria-hidden="true"
        class="relative -mx-[5%] h-[clamp(8px,1.5dvh,16px)] rounded-b-[50%_90%]
          border border-solid border-[#aaa8b1] shadow-[0_12px_25px_-6px_#25232c50]
          [background:linear-gradient(#dedde3,#aaa8b3_70%,#e9e8ec)]"
      >
        <span class="absolute left-1/2 top-0 h-1/2 w-[15%] -translate-x-1/2 rounded-b-full bg-[#918f9c]" />
      </div>
    </section>
  )
}
