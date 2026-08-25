import {For} from 'solid-js'
import {type LicenseEntry} from 'src/features/licenses'
import * as m from '@paraglide/message'

export const CreditList = (props: {readonly entries: ReadonlyArray<LicenseEntry>}) => (
  <ul class="m-0 grid list-none gap-3 p-0">
    <For each={props.entries}>
      {(entry) => (
        <li class="rounded-4 bg-secondary-soft p-4">
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h4 class="m-0 text-sm font-750 text-foreground">{entry.summaryName ?? entry.name}</h4>
            <span class="text-[0.6875rem] font-700 text-highlight">{entry.license}</span>
          </div>
          <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <For each={entry.links}>
              {(link) => (
                <a
                  class="font-650 text-highlight underline underline-offset-3"
                  href={link.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {link.label}
                  <span class="sr-only"> {m.credits_new_window()}</span>
                </a>
              )}
            </For>
          </div>
        </li>
      )}
    </For>
  </ul>
)
