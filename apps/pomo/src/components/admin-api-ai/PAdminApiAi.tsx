import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {Show} from 'solid-js'
import {type SaveApiAiRoutingResult, useAdminApiAi} from 'src/features/admin-api-ai'
import {PAdminApiAiOrder} from './PAdminApiAiOrder'
import {BUTTON_CLASSES} from './styles'

const feedbackText = (kind: SaveApiAiRoutingResult['kind'] | null): string | null => {
  switch (kind) {
    case 'saved':
      return '모델 순서를 저장했어요.'
    case 'invalid':
      return '모델 ID와 중복 여부를 확인해 주세요.'
    case 'conflict':
      return '다른 관리자가 설정을 변경했어요. 작성 중인 순서를 확인한 뒤 새로고침해 주세요.'
    case 'forbidden':
      return '관리자 권한을 확인한 뒤 다시 로그인해 주세요.'
    case 'unavailable':
      return '모델 순서를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'
    case null:
      return null
  }
}

export const PAdminApiAi = () => {
  const model = useAdminApiAi()
  return (
    <main class="min-h-dvh bg-#15120f px-5 py-8 text-#fffaf1 sm:px-8">
      <Title>AI 모델 순서 관리</Title>
      <header class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
        <div>
          <p class="m-0 text-xs font-750 tracking-[0.2em] text-#e8bc88">AI 운영</p>
          <h1 class="mb-0 mt-2 text-2xl font-800">클라우드 모델 사용 우선순위</h1>
        </div>
        <nav class="flex flex-wrap gap-2" aria-label="AI 관리">
          <A class={BUTTON_CLASSES} href="/admin/api-ai-models">
            지원 모델 관리
          </A>
          <A class={BUTTON_CLASSES} href="/admin">
            관리자 홈
          </A>
        </nav>
      </header>
      <section class="mx-auto mt-8 grid max-w-4xl gap-5" aria-label="AI 모델 설정">
        <p class="m-0 text-sm leading-6 text-white/70">
          서버의 공통 실행 순서입니다. 1순위부터 요청하고, 명확한 거절이나 사용 한도에 걸리면 다음
          모델을 사용합니다. 요청 접수 여부가 불확실하면 중복 과금을 피하기 위해 바로 재요청하지
          않습니다.
        </p>
        <div class="flex flex-wrap items-end justify-between gap-3">
          <button
            class={BUTTON_CLASSES}
            disabled={model.saving() || model.isLoading()}
            type="button"
            onClick={model.refresh}
          >
            새로고침
          </button>
        </div>
        <Show when={model.isLoading()}>
          <p role="status" class="m-0 text-white/70">
            모델 설정을 불러오는 중…
          </p>
        </Show>
        <Show when={model.loadFailed()}>
          <p role="alert" class="m-0 rounded-3 bg-red-950/40 p-4 text-red-200">
            모델 설정을 불러오지 못했어요. 새로고침해 주세요.
          </p>
        </Show>
        <Show when={model.saved()}>
          <PAdminApiAiOrder model={model} />
        </Show>
        <Show when={feedbackText(model.feedback())}>
          {(text) => (
            <p
              role={model.feedback() === 'saved' ? 'status' : 'alert'}
              class="m-0 rounded-3 border border-white/15 p-4 text-sm leading-6"
            >
              {text()}
            </p>
          )}
        </Show>
      </section>
    </main>
  )
}
