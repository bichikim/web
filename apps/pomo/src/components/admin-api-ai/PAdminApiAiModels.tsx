import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {For, type JSX, Show} from 'solid-js'
import {
  MAXIMUM_API_AI_MODEL_LABEL,
  MAXIMUM_API_AI_MODEL_LENGTH,
  type SaveApiAiRoutingResult,
  useApiAiCatalog,
} from 'src/features/admin-api-ai'
import {PAdminApiAiModel} from './PAdminApiAiModel'
import {BUTTON_CLASSES, INPUT_CLASSES} from './styles'

const feedbackText = (kind: SaveApiAiRoutingResult['kind'] | null): string | null => {
  switch (kind) {
    case 'saved':
      return '지원 모델 목록을 저장했어요.'
    case 'invalid':
      return '제공자와 모델 ID를 확인해 주세요. 중복 모델과 사용 중인 모델 삭제는 허용되지 않습니다.'
    case 'conflict':
      return '다른 화면에서 서버 설정을 변경했어요. 새로고침한 뒤 다시 시도해 주세요.'
    case 'forbidden':
      return '관리자 권한을 확인한 뒤 다시 로그인해 주세요.'
    case 'unavailable':
      return '모델 목록을 저장하지 못했어요. 다시 시도해 주세요.'
    case null:
      return null
  }
}
export const PAdminApiAiModels = () => {
  const model = useApiAiCatalog()
  const entries = () =>
    (model.saved()?.catalog ?? []).filter((entry) => entry.providerId === model.providerId())
  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    await model.register()
  }
  return (
    <main class="min-h-dvh bg-#15120f px-5 py-8 text-#fffaf1 sm:px-8">
      <Title>지원 모델 관리</Title>
      <header class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
        <div>
          <p class="m-0 text-xs font-750 tracking-[0.2em] text-#e8bc88">AI 운영</p>
          <h1 class="mb-0 mt-2 text-2xl font-800">제공자별 지원 모델</h1>
        </div>
        <A class={BUTTON_CLASSES} href="/admin/api-ai">
          모델 실행 순서
        </A>
      </header>
      <section aria-label="지원 모델 관리" class="mx-auto mt-8 grid max-w-4xl gap-5">
        <p class="m-0 text-sm leading-6 text-white/70">
          사용할 모델 ID를 등록한 뒤 실행 순서 화면에서 선택하세요. 모델 등록만으로 실행 순서가
          바뀌지는 않습니다.
        </p>
        <div class="flex flex-wrap items-end gap-3">
          <label class="grid min-w-0 flex-1 gap-2 text-sm">
            제공자
            <select
              class={INPUT_CLASSES}
              disabled={model.saving() || model.isLoading() || model.loadFailed()}
              onChange={(event) => model.setProviderId(event.currentTarget.value)}
            >
              <For each={model.saved()?.providers ?? []}>
                {(provider) => (
                  <option value={provider.id} selected={model.providerId() === provider.id}>
                    {provider.id}
                  </option>
                )}
              </For>
            </select>
          </label>
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
            모델 목록을 불러오는 중…
          </p>
        </Show>
        <Show when={model.loadFailed()}>
          <p role="alert" class="m-0 text-red-200">
            모델 목록을 불러오지 못했어요. 새로고침해 주세요.
          </p>
        </Show>
        <Show when={model.saved()}>
          <form
            onSubmit={handleSubmit}
            class="grid gap-3 rounded-4 border border-white/15 p-4 sm:p-5"
          >
            <fieldset
              disabled={
                model.saving() ||
                model.isLoading() ||
                model.loadFailed() ||
                model.providerId() === ''
              }
              class="m-0 grid min-w-0 gap-3 border-0 p-0"
            >
              <legend class="mb-3 text-base font-750">모델 등록</legend>
              <label class="grid min-w-0 gap-2 text-sm">
                모델 ID
                <input
                  class={INPUT_CLASSES}
                  required
                  maxLength={MAXIMUM_API_AI_MODEL_LENGTH}
                  value={model.modelId()}
                  placeholder="제공자의 정확한 모델 ID"
                  onInput={(event) => model.setModelId(event.currentTarget.value)}
                />
              </label>
              <label class="grid min-w-0 gap-2 text-sm">
                표시 이름 (선택)
                <input
                  class={INPUT_CLASSES}
                  maxLength={MAXIMUM_API_AI_MODEL_LABEL}
                  value={model.label()}
                  onInput={(event) => model.setLabel(event.currentTarget.value)}
                />
              </label>
              <button class={BUTTON_CLASSES} type="submit">
                {model.saving() ? '저장 중…' : '모델 등록'}
              </button>
            </fieldset>
          </form>
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
          <p class="m-0 text-xs leading-5 text-white/70">
            ‘안녕 테스트’는 선택한 모델에 짧은 인사를 요청합니다. 유료 모델은 해당 제공자의 사용
            요금이 발생하며, 실패해도 다른 모델로 넘어가지 않습니다.
          </p>
          <div class="grid min-w-0 gap-3">
            <For each={entries()}>
              {(entry) => <PAdminApiAiModel entry={entry} model={model} />}
            </For>
          </div>
          <Show when={entries().length === 0}>
            <p class="m-0 text-sm text-white/70">등록된 모델이 없습니다.</p>
          </Show>
        </Show>
      </section>
    </main>
  )
}
