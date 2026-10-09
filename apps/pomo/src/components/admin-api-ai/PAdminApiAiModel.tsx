import {Show} from 'solid-js'
import type {AdminApiAiPage, ApiAiCatalogController} from 'src/features/admin-api-ai'
import {BUTTON_CLASSES} from './styles'

interface PAdminApiAiModelProps {
  readonly entry: AdminApiAiPage['catalog'][number]
  readonly model: ApiAiCatalogController
}

export const PAdminApiAiModel = (props: PAdminApiAiModelProps) => {
  const handleTest = () => props.model.test(props.entry)
  const handleRemove = () => props.model.remove(props.entry)
  const state = () => props.model.testState(props.entry)
  const success = () => {
    const result = state()
    return result?.kind === 'success' ? result : null
  }
  const failure = () => {
    const result = state()
    return result?.kind === 'failure' ? result : null
  }
  return (
    <article
      aria-label={`${props.entry.providerId} ${props.entry.model}`}
      class="min-w-0 rounded-4 border border-white/15 bg-white/3 p-4 sm:p-5"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="m-0 text-xs text-#e8bc88">{props.entry.providerId}</p>
          <h2 class="mb-0 mt-2 break-all text-base font-750">
            {props.entry.label || props.entry.model}
          </h2>
          <Show when={props.entry.label}>
            <p class="mb-0 mt-1 break-all text-sm text-white/70">{props.entry.model}</p>
          </Show>
          <Show when={!props.entry.removable}>
            <p class="mb-0 mt-2 text-xs text-white/60">실행 순서 또는 서버 기본 설정에서 사용 중</p>
          </Show>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            class={BUTTON_CLASSES}
            disabled={
              props.model.saving() ||
              props.model.isLoading() ||
              props.model.loadFailed() ||
              state()?.kind === 'testing' ||
              !props.model
                .saved()
                ?.providers.some((provider) => provider.id === props.entry.providerId)
            }
            type="button"
            onClick={handleTest}
          >
            {state()?.kind === 'testing' ? '응답 대기 중…' : '안녕 테스트'}
          </button>
          <button
            class={BUTTON_CLASSES}
            disabled={
              !props.entry.removable ||
              props.model.saving() ||
              props.model.isLoading() ||
              props.model.loadFailed() ||
              state()?.kind === 'testing'
            }
            type="button"
            onClick={handleRemove}
          >
            삭제
          </button>
        </div>
      </div>
      <Show when={success()}>
        {(result) => (
          <div
            role="status"
            class="mt-4 grid gap-2 rounded-2 bg-emerald-950/40 p-3 text-sm leading-6 text-emerald-100"
          >
            <p class="m-0 font-700">테스트 성공 · {result().modelId}</p>
            <p class="m-0 whitespace-pre-wrap break-words">{result().text}</p>
            <p class="m-0 text-xs">총 토큰: {result().tokenCount ?? '미제공'}</p>
          </div>
        )}
      </Show>
      <Show when={failure()}>
        {(result) => (
          <div
            role="alert"
            class="mt-4 grid gap-2 rounded-2 bg-red-950/40 p-3 text-sm leading-6 text-red-100"
          >
            <p class="m-0 font-700">
              테스트 실패{result().status === null ? '' : ` · HTTP ${result().status}`}
            </p>
            <p class="m-0 whitespace-pre-wrap break-words">{result().message}</p>
            <Show when={result().details}>
              <p class="m-0 whitespace-pre-wrap break-words">{result().details}</p>
            </Show>
            <Show when={result().retryAfter}>
              <p class="m-0">Retry-After: {result().retryAfter}</p>
            </Show>
          </div>
        )}
      </Show>
    </article>
  )
}
