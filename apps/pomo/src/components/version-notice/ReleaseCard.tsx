import {createUniqueId, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {ReleaseBody} from './ReleaseBody'
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

      <div class="border-t border-solid border-border p-4 text-foreground settings-compact:p-3.5">
        <ReleaseBody release={props.release} />
        <Show when={!hasChanges() && !props.release.summary && !props.release.notes?.length}>
          <p class="m-0 text-sm leading-6 text-muted-foreground">
            {m.version_notice_initial_release()}
          </p>
        </Show>
      </div>
    </article>
  )
}
