import {For, Show} from 'solid-js'
import type {VersionRelease} from 'src/features/version-catalog'

export interface ReleaseBodyProps {
  readonly release: VersionRelease
}

export const ReleaseBody = (props: ReleaseBodyProps) => (
  <div class="grid gap-5 text-sm leading-7">
    <Show when={props.release.summary}>{(summary) => <p class="m-0">{summary()}</p>}</Show>
    <Show when={props.release.changes.length > 0}>
      <ul class="m-0 grid list-disc gap-3 pl-5">
        <For each={props.release.changes}>
          {(change) => (
            <li>
              <Show when={change.title}>
                {(title) => (
                  <>
                    <strong class="font-750">{title()}</strong>
                    {' — '}
                  </>
                )}
              </Show>
              {change.description}
            </li>
          )}
        </For>
      </ul>
    </Show>
    <Show when={props.release.notes?.length}>
      <footer class="grid gap-2">
        <For each={props.release.notes}>{(note) => <p class="m-0">※ {note}</p>}</For>
      </footer>
    </Show>
  </div>
)
