import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'

const Composition = clientOnly(async () => {
  const {PComposition} = await import('./image-composition/PComposition')
  return {default: PComposition}
})

export function ImageCompositionPage() {
  return (
    <main class="min-h-dvh bg-#17131f px-4 py-8 text-#f8edf1 sm:px-8">
      <Title>Pomofi — 이미지 조합</Title>
      <div class="mx-auto max-w-[100rem]">
        <A class="text-sm text-#f4d7b5 hover:text-white" href="/dev">
          ← 실험실 목록
        </A>
        <header class="mb-7 mt-6">
          <h1 class="m-0 text-3xl font-800">전체 장면 조합</h1>
        </header>
        <Composition fallback={<p>이미지 조합 도구를 준비하고 있습니다.</p>} />
      </div>
    </main>
  )
}
