import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import {HwpWorkspace} from './hwp/Workspace'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-4 py-8 text-#f8edf1',
  'xs:px-8 xs:py-12',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_70%_5%,#594560_0%,#2a2135_34%,#17131f_72%)]',
)
const PANEL_CLASSES = cx(
  'rounded-8 border border-white/10 bg-#211a2b/92 p-4 shadow-[0_1.75rem_6.25rem_rgba(5,2,10,0.45)]',
  'sm:p-6',
)
const FALLBACK_CLASSES = cx(
  'grid min-h-160 place-items-center rounded-6 border border-white/8 bg-black/15 p-8',
  'text-sm text-#bdb2c4',
)

function HwpPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomofi — 한글 문서 실험실</Title>
      <div class={BACKGROUND_CLASSES} />
      <div class="relative mx-auto grid w-full max-w-7xl gap-6">
        <nav class="flex flex-wrap items-center justify-between gap-4" aria-label="한글 문서 탐색">
          <A class="text-sm font-650 text-#bdb2c4 no-underline hover:text-white" href="/dev">
            ← 실험실 목록
          </A>
          <a
            class="text-sm font-650 text-#f4d7b5 no-underline hover:text-white"
            href="https://github.com/edwardkim/rhwp"
            rel="noreferrer"
            target="_blank"
          >
            rhwp 프로젝트 ↗
          </a>
        </nav>

        <header class="max-w-3xl">
          <p class="m-0 text-xs font-750 tracking-[0.28em] text-#f2a7b8 uppercase">
            Rust + WebAssembly · MIT
          </p>
          <h1 class="mb-0 mt-4 text-4xl font-800 tracking--0.045em sm:text-6xl">
            한글 문서 실험실
          </h1>
          <p class="mb-0 mt-5 max-w-2xl text-base leading-7 text-#bdb2c4 sm:text-lg">
            HWP와 HWPX 파일을 브라우저에서 직접 읽고, 채팅으로 가계부 양식에 넣을 데이터를 만들어
            보세요. 문서는 Pomo에 저장하지 않습니다.
          </p>
        </header>

        <section aria-labelledby="hwp-editor-heading" class={PANEL_CLASSES}>
          <div class="flex flex-wrap items-start justify-between gap-4 px-1 pb-5">
            <div>
              <h2 class="m-0 text-xl font-750" id="hwp-editor-heading">
                HWP 뷰어 · 양식 실험
              </h2>
              <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
                파일을 선택하면 직접 렌더링 또는 iframe 에디터로 문서를 열 수 있습니다. 아래
                채팅에서 가계부 필드 데이터를 만들 수 있어요.
              </p>
            </div>
            <span class="rounded-full bg-#f2a7b8/12 px-3 py-1 text-xs font-700 text-#ffc0ce">
              HWP · HWPX
            </span>
          </div>
          <HwpWorkspace
            fallback={
              <section aria-live="polite" class={FALLBACK_CLASSES}>
                브라우저용 한글 편집기를 불러오고 있어요…
              </section>
            }
          />
        </section>

        <div class="grid gap-4 md:grid-cols-3">
          <section
            class="rounded-6 border border-white/8 bg-white/4 p-5"
            aria-labelledby="formats-heading"
          >
            <h2 class="m-0 text-base font-750" id="formats-heading">
              지원 포맷
            </h2>
            <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
              HWP 5.0 바이너리와 HWPX를 브라우저에서 읽고 직접 렌더링과 iframe 에디터로 보여 줍니다.
            </p>
          </section>
          <section
            class="rounded-6 border border-white/8 bg-white/4 p-5"
            aria-labelledby="runtime-heading"
          >
            <h2 class="m-0 text-base font-750" id="runtime-heading">
              브라우저 처리
            </h2>
            <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
              직접 렌더링은 Pomo 서버에 문서를 업로드하지 않고, Rust/WASM 엔진을 클라이언트에서
              실행합니다. iframe 모드는 rhwp-studio를 사용합니다.
            </p>
          </section>
          <section
            class="rounded-6 border border-white/8 bg-white/4 p-5"
            aria-labelledby="scope-heading"
          >
            <h2 class="m-0 text-base font-750" id="scope-heading">
              개발용 실험실
            </h2>
            <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
              현재는 `/dev`에서만 확인할 수 있는 통합 실험입니다. 필드 적용 결과는 파일로 저장해야
              보존됩니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}

export default HwpPage
