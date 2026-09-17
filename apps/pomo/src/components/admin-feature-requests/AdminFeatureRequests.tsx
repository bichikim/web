import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {For, Show} from 'solid-js'

import {useAdminFeatureRequests} from '../../features/feature-requests/use-admin-feature-requests'
import {AdminFeatureRequestCard} from './AdminFeatureRequestCard'

export const AdminFeatureRequests = () => {
  const model = useAdminFeatureRequests()
  const handleRequestSave = async (input: Parameters<typeof model.updateRequest>[0]) => {
    const result = await model.updateRequest(input)

    if (result.status === 'updated') {
      return null
    }

    return result.status === 'not-found'
      ? '요청을 찾지 못했습니다.'
      : result.status === 'invalid'
        ? '입력한 상태를 저장할 수 없습니다.'
        : result.status === 'conflict'
          ? '현재 상태와 충돌했습니다. 목록을 새로고침해 주세요.'
          : '상태를 저장하지 못했습니다.'
  }

  return (
    <main class="min-h-dvh bg-#15120f px-5 py-8 text-#fffaf1 sm:px-8">
      <Title>기능 요청 관리 · 앱</Title>
      <header class="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
        <div>
          <p class="m-0 text-xs font-750 tracking-[0.24em] text-#e8bc88 uppercase">앱 관리</p>
          <h1 class="mb-0 mt-2 text-2xl font-800 tracking--0.03em">기능 요청 관리</h1>
        </div>
        <A
          class="rounded-2 border border-white/15 px-3 py-2 text-sm text-white/75 no-underline hover:bg-white/10"
          href="/admin"
        >
          관리자 홈
        </A>
      </header>

      <Show when={model.loadFailed()}>
        <div
          class={
            'mx-auto mt-6 flex w-full max-w-4xl items-center justify-between gap-3 rounded-3 ' +
            'bg-white/7 px-4 py-3 text-sm'
          }
          role="alert"
        >
          <span>기능 요청을 불러오지 못했습니다.</span>
          <button
            class="rounded-2 bg-white/10 px-3 py-2 font-700 hover:bg-white/15"
            onClick={() => model.refresh().catch(() => undefined)}
            type="button"
          >
            다시 시도
          </button>
        </div>
      </Show>

      <Show when={!model.isLoading()}>
        <section class="mx-auto mt-8 grid w-full max-w-4xl gap-4">
          <Show
            fallback={<p class="text-sm text-white/55">등록된 기능 요청이 없습니다.</p>}
            when={model.requests().length > 0}
          >
            <For each={model.requests()}>
              {(request) => (
                <AdminFeatureRequestCard
                  disabled={model.updatingRequestId() === request.id}
                  onSave={handleRequestSave}
                  request={request}
                />
              )}
            </For>
          </Show>
        </section>
      </Show>
    </main>
  )
}
