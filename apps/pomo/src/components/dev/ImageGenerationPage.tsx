import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'

const Workspace = clientOnly(() => import('./image-generation/Workspace'), {lazy: true})

export default function ImageGenerationPage() {
  return (
    <main class="min-h-dvh bg-#17131f px-5 py-8 text-#f8edf1 sm:px-8">
      <Title>Pomofi — 이미지 생성</Title>
      <div class="mx-auto max-w-6xl">
        <A class="inline-flex min-h-11 items-center text-sm text-#f4d7b5 no-underline" href="/dev">
          ← 실험실 목록
        </A>
        <Workspace fallback={<p role="status">이미지 생성 환경을 준비하고 있어요…</p>} />
      </div>
    </main>
  )
}
