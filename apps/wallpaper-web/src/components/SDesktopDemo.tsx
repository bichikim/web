import {SWidgetPlayground} from './SWidgetPlayground'

export const SDesktopDemo = () => (
  <section aria-labelledby="hero-heading" class="page-width pb-10 pt-8 sm:pt-12">
    <div class="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        <p class="mb-3 text-[11px] font-550 tracking-[0.03em] text-muted">
          데스크톱 캐릭터 위젯 · 움직이는 배경화면
        </p>
        <h1
          id="hero-heading"
          class="text-[clamp(2.9rem,7.4vw,7rem)] font-600 leading-none tracking-[-0.065em]"
        >
          Poffo Wallpaper<span class="text-violet">.</span>
        </h1>
      </div>
      <p class="max-w-66 text-sm leading-7 text-muted break-keep md:pb-1">
        캐릭터를 드래그하고 크기를 바꿔 보세요.
        <br />앱 설치 전에 여기서 먼저 체험할 수 있어요.
      </p>
    </div>
    <div id="widget" class="scroll-mt-8">
      <SWidgetPlayground />
    </div>
  </section>
)
