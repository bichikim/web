import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createSignal, type JSX, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {useAdminCloudText} from 'src/features/admin-cloud-text'
import {KeyedList} from '../keyed-list'
import {PAdminCloudTextUserRow} from './PAdminCloudTextUserRow'

const feedbackText = (kind: ReturnType<ReturnType<typeof useAdminCloudText>['feedback']>) => {
  switch (kind) {
    case 'updated':
      return m.admin_cloud_saved()
    case 'reset':
      return m.admin_cloud_usage_reset()
    case 'invalid':
      return m.admin_cloud_invalid()
    case 'not-found':
      return m.admin_cloud_user_missing()
    case 'forbidden':
      return m.admin_cloud_auth_failed()
    case 'unavailable':
      return m.admin_cloud_save_failed()
    case null:
      return null
  }
}

export const PAdminCloudText = () => {
  const model = useAdminCloudText()
  const [search, setSearch] = createSignal('')
  const handleSearch: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (event) => {
    event.preventDefault()
    model.search(search())
  }
  return (
    <main class="min-h-dvh bg-#15120f px-5 py-8 text-#fffaf1 sm:px-8">
      <Title>{m.admin_cloud_title()}</Title>
      <header class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <p class="m-0 text-xs font-750 tracking-[0.24em] text-#e8bc88">
            {m.admin_cloud_eyebrow()}
          </p>
          <h1 class="mb-0 mt-2 text-2xl font-800">{m.admin_cloud_title()}</h1>
        </div>
        <A
          class="rounded-2 border border-white/15 px-3 py-2 text-sm text-white/75 no-underline hover:bg-white/10"
          href="/admin"
        >
          {m.admin_cloud_home()}
        </A>
      </header>
      <section class="mx-auto mt-8 grid w-full max-w-6xl gap-5" aria-label={m.admin_cloud_title()}>
        <p class="m-0 text-sm leading-6 text-white/65">{m.admin_cloud_description()}</p>
        <div class="flex flex-wrap justify-between gap-3">
          <form class="flex min-w-0 flex-1 gap-2 sm:flex-none" onSubmit={handleSearch}>
            <input
              aria-label={m.admin_cloud_search_label()}
              class={cx(
                'min-w-0 w-full rounded-2 border border-white/40 bg-white/5 px-3 py-2',
                'text-sm text-white outline-none focus-visible:border-#e8bc88',
                'focus-visible:ring-2 focus-visible:ring-#e8bc88/25 sm:w-80',
              )}
              onInput={(event) => setSearch(event.currentTarget.value)}
              placeholder={m.admin_cloud_search_label()}
              type="search"
              value={search()}
            />
            <button
              class="shrink-0 rounded-2 bg-white/10 px-4 py-2 text-sm disabled:opacity-50"
              disabled={model.isLoading() || model.savingUserId() !== null}
              type="submit"
            >
              {m.admin_cloud_search()}
            </button>
          </form>
          <button
            class="rounded-2 border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
            disabled={model.isLoading() || model.savingUserId() !== null}
            onClick={model.refresh}
            type="button"
          >
            {m.admin_cloud_refresh()}
          </button>
        </div>
        <Show when={model.loadFailed()}>
          <p class="m-0 rounded-3 bg-white/7 p-4 text-sm text-#ff9e8f" role="alert">
            {m.admin_cloud_load_failed()}
          </p>
        </Show>
        <Show when={model.isLoading()}>
          <p class="m-0 text-sm text-white/60" role="status">
            {m.admin_cloud_loading()}
          </p>
        </Show>
        <Show when={feedbackText(model.feedback())}>
          {(message) => (
            <p class="m-0 text-sm text-#f3d1a9" role="status">
              {message()}
            </p>
          )}
        </Show>
        <div class="min-w-0 2xl:overflow-x-auto 2xl:rounded-3 2xl:border 2xl:border-white/10">
          <table class="block w-full border-collapse text-sm 2xl:table">
            <caption class="block pb-4 text-left text-xs leading-5 text-white/65 2xl:table-caption 2xl:p-5">
              {m.admin_cloud_table_caption()}
            </caption>
            <thead class="hidden bg-white/4 text-xs text-white/65 2xl:table-header-group">
              <tr>
                <th class="px-5 py-3 text-left font-500" scope="col">
                  {m.admin_cloud_user()}
                </th>
                <th class="whitespace-nowrap px-4 py-3 font-500" scope="col">
                  {m.admin_cloud_used()}
                </th>
                <th class="whitespace-nowrap px-4 py-3 font-500" scope="col">
                  {m.admin_cloud_remaining()}
                </th>
                <th class="min-w-62 px-4 py-3 text-left font-500" scope="col">
                  {m.admin_cloud_daily_limit()}
                </th>
                <th class="px-4 py-3 text-left font-500" scope="col">
                  {m.admin_cloud_actions()}
                </th>
              </tr>
            </thead>
            <tbody class="grid gap-3 2xl:table-row-group">
              <KeyedList by={(user) => user.id} each={model.users()}>
                {(user) => (
                  <PAdminCloudTextUserRow
                    disabled={model.isLoading() || model.savingUserId() !== null}
                    onSave={model.saveLimit}
                    onReset={model.resetUsage}
                    user={user()}
                  />
                )}
              </KeyedList>
            </tbody>
          </table>
        </div>
        <Show when={!model.isLoading() && !model.loadFailed() && model.users().length === 0}>
          <p class="m-0 text-sm text-white/60">{m.admin_cloud_empty()}</p>
        </Show>
        <Show when={model.hasMore()}>
          <button
            class="justify-self-center rounded-2 bg-white/10 px-4 py-2 text-sm disabled:opacity-50"
            disabled={model.isLoading() || model.savingUserId() !== null}
            onClick={model.loadMore}
            type="button"
          >
            {m.admin_cloud_more()}
          </button>
        </Show>
      </section>
    </main>
  )
}
