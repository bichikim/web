import {SIcon} from './SIcon'

export const SWidgetSection = () => (
  <section id="details" aria-labelledby="widget-heading" class="page-width py-14 sm:py-22">
    <div class="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-24">
      <div>
        <p class="section-label">WIDGET</p>
        <h2
          id="widget-heading"
          class="mt-5 text-[clamp(2.4rem,4vw,4rem)] font-600 leading-[1.2] tracking-[-0.065em]"
        >
          화면 위에 띄우는
          <br />
          캐릭터 위젯.
        </h2>
        <p class="body-copy mt-6 max-w-85">
          위젯은 별도의 데스크톱 창으로 떠 있어요. 쓰던 앱 위에 올려 두거나, 화면 구석에 작게
          배치하세요.
        </p>
        <a
          href="#widget"
          class="mt-7 inline-flex min-h-10 items-center gap-5 text-xs font-600 text-violet"
        >
          위에서 직접 해보기 <SIcon class="h-5.5 w-5.5 -rotate-45" />
        </a>
      </div>
      <div class="border-0 border-t border-solid border-ink/15">
        <article class="grid grid-cols-[2rem_1fr] gap-5 border-0 border-b border-solid border-ink/15 py-6">
          <span class="pt-1 font-mono text-[10px] text-muted">01</span>
          <div>
            <h3 class="text-lg font-600 tracking-tight">위치와 크기 조절</h3>
            <p class="mt-2 text-sm leading-7 text-muted">
              드래그해서 옮기고 크기를 조절해요. 작은 캐릭터 하나만 띄워 둬도 좋아요.
            </p>
          </div>
        </article>
        <article class="grid grid-cols-[2rem_1fr] gap-5 border-0 border-b border-solid border-ink/15 py-6">
          <span class="pt-1 font-mono text-[10px] text-muted">02</span>
          <div>
            <h3 class="text-lg font-600 tracking-tight">커서 · 카메라 트래킹</h3>
            <p class="mt-2 text-sm leading-7 text-muted">
              커서나 카메라 입력에 맞춰 움직이도록 설정하세요. 반응하는 정도도 조절할 수 있어요.
            </p>
          </div>
        </article>
        <article class="grid grid-cols-[2rem_1fr] gap-5 border-0 border-b border-solid border-ink/15 py-6">
          <span class="pt-1 font-mono text-[10px] text-muted">03</span>
          <div>
            <h3 class="text-lg font-600 tracking-tight">Poffo 캐릭터 불러오기</h3>
            <p class="mt-2 text-sm leading-7 text-muted">
              Poffo 파일을 불러오면 다른 캐릭터도 위젯으로 사용할 수 있어요.
            </p>
          </div>
        </article>
      </div>
    </div>
    <details class="mt-12 rounded-5 bg-lilac/50 px-6 py-5">
      <summary class="flex min-h-10 cursor-pointer list-none items-center justify-between gap-4 text-sm font-550">
        위젯 설정 화면 보기 <SIcon name="plus" />
      </summary>
      <div class="mt-6 grid gap-7 sm:grid-cols-[1fr_1fr] sm:items-center">
        <img
          src="/images/settings-widget.png"
          alt="Poffo Wallpaper의 실제 위젯 설정 화면"
          loading="lazy"
          width="560"
          height="720"
          class="mx-auto w-full max-w-75 rounded-3"
        />
        <p class="max-w-80 text-sm leading-7 text-muted">
          캐릭터 파일, 움직임, 트래킹을 위젯마다 설정해요. Codex를 연결하면 작업 상태와 응답을
          말풍선으로 확인할 수도 있어요.
        </p>
      </div>
    </details>
  </section>
)
