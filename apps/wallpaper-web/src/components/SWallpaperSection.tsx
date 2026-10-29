import {SIcon} from './SIcon'

export const SWallpaperSection = () => (
  <section id="wallpaper" aria-labelledby="wallpaper-heading" class="page-width py-12 sm:py-20">
    <div class="relative isolate overflow-hidden rounded-8 bg-[#27332d]">
      <img
        src="/images/meadow.webp"
        alt="언덕 풍경을 배경화면으로 설정한 예시"
        width="1672"
        height="941"
        loading="lazy"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-r from-[#15241e]/90 via-[#15241e]/65 to-[#15241e]/5" />
      <div class="relative px-7 py-14 text-white sm:px-14 sm:py-20">
        <p class="text-[10px] font-600 tracking-[0.14em] text-white/75">WALLPAPER</p>
        <h2
          id="wallpaper-heading"
          class="mt-5 text-[clamp(2.2rem,4vw,3.5rem)] font-550 leading-[1.2] tracking-[-0.06em]"
        >
          사진, 영상, 웹사이트를
          <br />
          배경화면으로.
        </h2>
        <p class="mt-5 max-w-85 text-sm leading-7 text-white/85">
          사진·동영상 앨범, 움직이는 Poffo 캐릭터,
          <br class="hidden sm:block" /> 즐겨 찾는 웹사이트를 배경으로 설정해요.
        </p>
        <div class="mt-8 flex flex-wrap gap-3 text-[11px] text-white/90">
          <span class="rounded-full border border-solid border-white/35 px-4 py-2">
            사진 · 동영상
          </span>
          <span class="rounded-full border border-solid border-white/35 px-4 py-2">
            Poffo 캐릭터
          </span>
          <span class="rounded-full border border-solid border-white/35 px-4 py-2">웹사이트</span>
        </div>
        <p class="mt-8 flex items-center gap-3 text-[11px] text-white/75">
          <SIcon name="monitor" /> 모니터마다 따로 설정할 수 있어요.
        </p>
      </div>
    </div>
  </section>
)
