import {cx} from 'class-variance-authority'
import {createResource, createSignal, For, onCleanup, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {type BackgroundController} from 'src/features/background'
import {
  type BackgroundSet,
  downloadBackgroundSet,
  loadBackgroundSets,
} from 'src/features/background-sets'
import {PSettingsActionButton} from '../ActionButton'

export interface CatalogProps {
  readonly background: BackgroundController
  readonly onAdded: () => void
}
export const Catalog = (props: CatalogProps) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  const [catalog, {refetch}] = createResource(() => loadBackgroundSets(controller.signal))
  const [pending, setPending] = createSignal<string | null>(null)
  const [failed, setFailed] = createSignal(false)
  const add = async (set: BackgroundSet) => {
    if (pending() !== null) {
      return
    }
    setPending(set.id)
    setFailed(false)
    try {
      const files = await downloadBackgroundSet(set, controller.signal)
      controller.signal.throwIfAborted()
      await props.background.add(files)
      if (!controller.signal.aborted) {
        if (props.background.error() === null) {
          props.onAdded()
        } else {
          setFailed(true)
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        setFailed(true)
      }
    } finally {
      if (!controller.signal.aborted) {
        setPending(null)
      }
    }
  }
  return (
    <>
      <Show when={catalog.loading}>
        <p role="status">{m.background_sets_loading()}</p>
      </Show>
      <Show when={catalog.error || failed()}>
        <p class="m-0 text-sm text-danger" role="alert">
          {m.background_sets_error()}
        </p>
        <Show when={catalog.error}>
          <PSettingsActionButton onPress={() => refetch()}>
            {m.background_retry()}
          </PSettingsActionButton>
        </Show>
      </Show>
      <Show when={!catalog.error}>
        <ul class="m-0 grid list-none gap-4 p-0">
          <For each={catalog()}>
            {(set) => (
              <li
                class="flex items-center gap-3 rounded-control border border-solid border-border p-4"
                data-set-id={set.id}
              >
                <span
                  class={cx(
                    set.kind === 'photo' ? 'i-tabler-photo' : 'i-tabler-movie',
                    'size-6 shrink-0 text-muted-foreground',
                  )}
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-1 text-sm font-medium">
                  {getLocale() === 'ko' ? set.title.ko : set.title.en}
                </span>
                <Show
                  when={set.items.length > 0}
                  fallback={
                    <span class="shrink-0 text-xs text-muted-foreground">
                      {m.background_set_pending()}
                    </span>
                  }
                >
                  <PSettingsActionButton
                    disabled={
                      pending() !== null || props.background.busy() || !props.background.ready()
                    }
                    onPress={() => add(set)}
                  >
                    {pending() === set.id
                      ? m.background_sets_downloading()
                      : m.background_set_add()}
                  </PSettingsActionButton>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  )
}
