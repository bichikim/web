import {createUniqueId, For, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {type VersionRelease} from '../../features/version-catalog'

interface VersionReleaseCardProps {
  readonly release: VersionRelease
}

export const VersionReleaseCard = (props: VersionReleaseCardProps) => {
  const titleId = createUniqueId()
  const hasChanges = () => props.release.changes.length > 0

  return (
    <article
      aria-labelledby={titleId}
      class="overflow-hidden rounded-5 border border-solid border-border bg-surface"
    >
      <header class="flex items-center gap-3 p-4 settings-compact:p-3.5">
        <span
          aria-hidden="true"
          class={
            'grid size-10 flex-none place-items-center rounded-control border border-solid ' +
            'border-border bg-secondary-soft text-highlight'
          }
        >
          <span class={hasChanges() ? 'i-tabler-sparkles size-5' : 'i-tabler-rocket size-5'} />
        </span>
        <div class="min-w-0 flex-1">
          <h3 class="m-0 text-[0.9375rem] font-750 leading-5 text-foreground" id={titleId}>
            {props.release.title}
          </h3>
          <time
            class="mt-1 block text-modal-detail font-650 leading-5 text-muted-foreground"
            dateTime={props.release.releasedAt}
          >
            {props.release.version}
          </time>
        </div>
      </header>

      <Show
        fallback={
          <p class="m-0 border-t border-solid border-border px-4 py-3.5 text-sm leading-6 text-muted-foreground">
            {m.version_notice_initial_release()}
          </p>
        }
        when={hasChanges()}
      >
        <ul class="m-0 list-none border-t border-solid border-border p-0">
          <For each={props.release.changes}>
            {(change) => (
              <li
                class={
                  'flex items-start gap-3 border-b border-solid border-border px-4 py-3.5 ' +
                  'text-sm leading-6 text-foreground last:border-b-0 settings-compact:px-3.5'
                }
                role="listitem"
              >
                <span
                  aria-hidden="true"
                  class="i-tabler-check mt-1 size-4 flex-none text-highlight"
                />
                <span>{change}</span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </article>
  )
}
