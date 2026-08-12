import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

const MAIN_CLASSES = cx(
  'relative grid min-h-dvh place-items-center overflow-hidden',
  'bg-#17131f px-5 py-12 text-#f8edf1 sm:px-8',
)
const CARD_CLASSES = cx(
  'group grid min-h-60 content-between overflow-hidden rounded-7 border border-white/10 p-6',
  'bg-white/4 text-inherit no-underline shadow-[0_24px_70px_rgba(5,2,10,0.28)]',
  'transition hover:-translate-y-1 hover:border-#f2a7b8/35 hover:bg-white/7',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_10%,#624b68_0%,#2a2135_36%,#17131f_72%)]',
)

export default function HomePage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomo — Creative Labs</Title>
      <div class={BACKGROUND_CLASSES} />
      <section class="relative w-full max-w-5xl">
        <header class="max-w-2xl">
          <p class="m-0 text-xs font-750 tracking-[0.28em] text-#f2a7b8 uppercase">
            Pomo creative labs
          </p>
          <h1 class="mb-0 mt-4 text-4xl font-800 tracking--0.045em sm:text-6xl">
            캐릭터를 만들고,
            <br />
            목소리를 입혀 보세요
          </h1>
          <p class="mb-0 mt-5 max-w-xl text-base leading-7 text-#bdb2c4 sm:text-lg">
            각 기능은 독립된 주소에서 실험할 수 있어요. 먼저 3D 캐릭터를 확인하거나 기기 안에서
            음성을 생성해 보세요.
          </p>
        </header>

        <div class="mt-10 grid gap-4 md:grid-cols-2">
          <A class={CARD_CLASSES} href="/focus-room">
            <div class="flex items-start justify-between gap-5">
              <div>
                <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f0c99a uppercase">
                  2D character · 12 scenes
                </p>
                <h2 class="mb-0 mt-3 text-2xl font-750">2D 포커스 룸</h2>
                <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
                  낮과 밤, 작업 종류와 캐릭터 시선을 바꿔 장면 전환을 실험해요.
                </p>
              </div>
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f0c99a/12 text-xl text-#f4d7b5">
                ◐
              </span>
            </div>
            <span class="mt-8 text-sm font-700 text-#f4d7b5">포커스 룸 열기 →</span>
          </A>

          <A class={CARD_CLASSES} href="/character">
            <div class="flex items-start justify-between gap-5">
              <div>
                <p class="m-0 text-xs font-700 tracking-[0.2em] text-#9ed6bb uppercase">
                  Babylon.js · Blender
                </p>
                <h2 class="mb-0 mt-3 text-2xl font-750">3D 캐릭터 스튜디오</h2>
                <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
                  GLB 캐릭터를 렌더링하고 Blender에서 내보낸 모델로 바로 교체해요.
                </p>
              </div>
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#9ed6bb/12 text-xl text-#b8e8d0">
                ◇
              </span>
            </div>
            <span class="mt-8 text-sm font-700 text-#b8e8d0">3D 실험실 열기 →</span>
          </A>

          <A class={CARD_CLASSES} href="/voice">
            <div class="flex items-start justify-between gap-5">
              <div>
                <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f2a7b8 uppercase">
                  Supertonic 3 · On-device
                </p>
                <h2 class="mb-0 mt-3 text-2xl font-750">음성 생성 스튜디오</h2>
                <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
                  기존 음성 생성 흐름을 독립된 페이지에서 준비하고 검증해요.
                </p>
              </div>
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f2a7b8/12 text-xl text-#ffc0ce">
                ♪
              </span>
            </div>
            <span class="mt-8 text-sm font-700 text-#ffc0ce">음성 실험실 열기 →</span>
          </A>

          <A class={CARD_CLASSES} href="/dialogue">
            <div class="flex items-start justify-between gap-5">
              <div>
                <p class="m-0 text-xs font-700 tracking-[0.2em] text-#9ed6bb uppercase">
                  Qwen3.5 0.8B–4B · WebGPU
                </p>
                <h2 class="mb-0 mt-3 text-2xl font-750">답변 생성 실험실</h2>
                <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
                  한 번의 요청에 사려 깊은 한 사람이 자연스러운 존댓말로 충분히 답해요.
                </p>
              </div>
              <span
                class={cx(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#9ed6bb/12',
                  'text-sm font-800 text-#b8e8d0',
                )}
              >
                Aa
              </span>
            </div>
            <span class="mt-8 text-sm font-700 text-#b8e8d0">답변 실험실 열기 →</span>
          </A>

          <A class={CARD_CLASSES} href="/chat">
            <div class="flex items-start justify-between gap-5">
              <div>
                <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f2a7b8 uppercase">
                  Qwen3.5-4B · Context memory
                </p>
                <h2 class="mb-0 mt-3 text-2xl font-750">온디바이스 채팅</h2>
                <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
                  오래된 대화를 기억 메모로 압축하면서 브라우저 안에서 대화를 이어 가요.
                </p>
              </div>
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f2a7b8/12 text-xl text-#ffc0ce">
                ◌
              </span>
            </div>
            <span class="mt-8 text-sm font-700 text-#ffc0ce">채팅 열기 →</span>
          </A>

          <A class={CARD_CLASSES} href="/speech-to-text">
            <div class="flex items-start justify-between gap-5">
              <div>
                <p class="m-0 text-xs font-700 tracking-[0.2em] text-#9ed6bb uppercase">
                  Whisper tiny · WebGPU / WASM
                </p>
                <h2 class="mb-0 mt-3 text-2xl font-750">한국어 받아쓰기</h2>
                <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
                  마이크로 녹음한 한국어를 서버 전송 없이 브라우저 안에서 글로 바꿔요.
                </p>
              </div>
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#9ed6bb/12 text-xl text-#b8e8d0">
                ●
              </span>
            </div>
            <span class="mt-8 text-sm font-700 text-#b8e8d0">받아쓰기 실험실 열기 →</span>
          </A>
        </div>

        <footer class="mt-8 flex justify-end">
          <A class="text-xs font-650 text-#8f8297 no-underline hover:text-white" href="/terms">
            서비스 이용약관 초안
          </A>
        </footer>
      </section>
    </main>
  )
}
