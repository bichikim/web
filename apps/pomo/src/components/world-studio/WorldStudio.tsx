import {cx} from 'class-variance-authority'
import {createSignal, Show} from 'solid-js'

import {WorldViewportCanvas} from './WorldViewportCanvas'

type WorldRenderStatus = 'error' | 'loading' | 'ready'

const STATUS_LABELS: Record<WorldRenderStatus, string> = {
  error: '에셋 대체 모드',
  loading: '장면 준비 중',
  ready: '렌더링 준비 완료',
}

const FRAME_CLASSES = cx(
  'grid gap-4 rounded-7 border border-white/10 bg-#121a22/88 p-4',
  'shadow-[0_24px_80px_rgba(0,0,0,0.28)] xs:p-5',
)
const VIEWPORT_CLASSES = cx(
  'relative aspect-[16/10] min-h-80 overflow-hidden rounded-5 border border-white/12 bg-#0b1016',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] xs:min-h-100',
)
const CAMERA_HINT_CLASSES = cx(
  'pointer-events-none absolute inset-x-4 bottom-4 flex justify-between gap-3',
  'text-xs text-white/60',
)

export function WorldStudio() {
  const [status, setStatus] = createSignal<WorldRenderStatus>('loading')

  return (
    <section class="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section class={FRAME_CLASSES}>
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="m-0 text-xs font-800 tracking-[0.24em] text-#a9e5d2 uppercase">
              Babylon.js · PBR lookdev
            </p>
            <h1 class="mb-0 mt-3 text-3xl font-800 tracking-[-0.04em] text-white xs:text-4xl">
              Hinata character
            </h1>
            <p class="mb-0 mt-3 max-w-xl text-sm leading-6 text-#aab5bd">
              캐릭터를 기준으로 환경광, 재질 반사, 키 라이트, 그림자와 최종 톤을 맞춥니다.
            </p>
          </div>
          <span
            class="rounded-full border border-#a9e5d2/25 bg-#a9e5d2/10 px-3 py-1.5 text-xs font-750 text-#b8e8d0"
            aria-live="polite"
          >
            {STATUS_LABELS[status()]}
          </span>
        </div>
        <div class={VIEWPORT_CLASSES}>
          <WorldViewportCanvas onStatus={(value) => setStatus(value)} />
          <div class={CAMERA_HINT_CLASSES}>
            <span>드래그 · 카메라 회전</span>
            <span>휠 · 거리 조절 · 방향 버튼 · 이동</span>
          </div>
        </div>
      </section>

      <aside class="grid content-start gap-4">
        <section class="grid gap-4 rounded-7 border border-white/10 bg-#171f28/88 p-5 text-#d9e1e6">
          <div>
            <p class="m-0 text-xs font-800 tracking-[0.2em] text-#f0c99a uppercase">
              Render recipe
            </p>
            <h2 class="mb-0 mt-2 text-lg font-750">첫 번째 기준 장면</h2>
          </div>
          <dl class="grid gap-3 text-sm">
            <div class="flex items-baseline justify-between gap-4 border-b border-white/8 pb-3">
              <dt class="text-#8e9ca7">환경광</dt>
              <dd class="m-0 font-700 text-#f0c99a">EXR 환경광</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-b border-white/8 pb-3">
              <dt class="text-#8e9ca7">재질</dt>
              <dd class="m-0 font-700 text-#b8e8d0">PBR / 거친 반사</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-b border-white/8 pb-3">
              <dt class="text-#8e9ca7">직접광</dt>
              <dd class="m-0 font-700 text-#f0c99a">키 + 림 라이트</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-b border-white/8 pb-3">
              <dt class="text-#8e9ca7">에셋</dt>
              <dd class="m-0 font-700 text-#b8e8d0">Hinata GLB</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-#8e9ca7">마감</dt>
              <dd class="m-0 font-700 text-#f2b4c0">ACES · FXAA · 약한 Bloom</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-#8e9ca7">공간감</dt>
              <dd class="m-0 font-700 text-#b8e8d0">SSAO2 · 비네팅 · 디더링</dd>
            </div>
          </dl>
          <Show when={status() === 'error'}>
            <p
              class="m-0 rounded-3 border border-#f0c99a/20 bg-#f0c99a/8 p-3 text-sm leading-6 text-#f5d6ad"
              role="alert"
            >
              환경광이나 3D 모델 에셋을 불러오지 못해 현재 장면을 대체 모드로 표시하고 있어요.
            </p>
          </Show>
        </section>

        <section class="grid gap-3 rounded-7 border border-white/10 bg-#171f28/88 p-5 text-#d9e1e6">
          <h2 class="m-0 text-lg font-750">이번 장면에서 볼 것</h2>
          <ul class="m-0 grid gap-2 pl-5 text-sm leading-6 text-#9ba8b1">
            <li>캐릭터 실루엣과 키 라이트가 얼굴과 몸에 만드는 명암</li>
            <li>바닥에 생기는 발밑 그림자의 방향과 농도</li>
            <li>환경광과 PBR 재질이 머리카락과 의상에 만드는 반사</li>
          </ul>
        </section>
      </aside>
    </section>
  )
}
