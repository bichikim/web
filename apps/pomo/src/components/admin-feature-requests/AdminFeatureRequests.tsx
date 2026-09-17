import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {For, Show} from 'solid-js'
import * as m from '@paraglide/message'

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
      ? m.admin_feature_request_update_not_found()
      : result.status === 'invalid'
        ? m.admin_feature_request_update_invalid()
        : result.status === 'conflict'
          ? m.admin_feature_request_update_conflict()
          : m.admin_feature_request_update_failed()
  }

  return (
    <main class="min-h-dvh bg-#15120f px-5 py-8 text-#fffaf1 sm:px-8">
      <Title>{m.admin_feature_requests_page_title()}</Title>
      <header class="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
        <div>
          <p class="m-0 text-xs font-750 tracking-[0.24em] text-#e8bc88 uppercase">
            {m.admin_feature_requests_eyebrow()}
          </p>
          <h1 class="mb-0 mt-2 text-2xl font-800 tracking--0.03em">
            {m.admin_feature_requests_heading()}
          </h1>
        </div>
        <A
          class="rounded-2 border border-white/15 px-3 py-2 text-sm text-white/75 no-underline hover:bg-white/10"
          href="/admin"
        >
          {m.admin_feature_requests_home()}
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
          <span>{m.admin_feature_requests_load_failed()}</span>
          <button
            class="rounded-2 bg-white/10 px-3 py-2 font-700 hover:bg-white/15"
            onClick={() => model.refresh().catch(() => undefined)}
            type="button"
          >
            {m.feature_request_retry()}
          </button>
        </div>
      </Show>

      <Show when={!model.isLoading()}>
        <section class="mx-auto mt-8 grid w-full max-w-4xl gap-4">
          <Show
            fallback={<p class="text-sm text-white/55">{m.admin_feature_requests_empty()}</p>}
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

      <Show when={model.hasMore()}>
        <div class="mx-auto mt-6 grid justify-items-center gap-2">
          <button
            class="rounded-2 bg-white/10 px-3 py-2 text-sm font-700 hover:bg-white/15 disabled:opacity-50"
            disabled={model.isLoadingMore()}
            onClick={() => model.loadMore().catch(() => undefined)}
            type="button"
          >
            {model.isLoadingMore()
              ? m.feature_request_loading_more()
              : m.feature_request_load_more()}
          </button>
          <Show when={model.loadMoreFailed()}>
            <span class="text-sm text-#ff9e8f" role="alert">
              {m.feature_request_load_more_failed()}
            </span>
          </Show>
        </div>
      </Show>
    </main>
  )
}
