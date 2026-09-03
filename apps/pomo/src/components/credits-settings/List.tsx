import {cx} from 'class-variance-authority'
import {For} from 'solid-js'
import type {LicenseEntry} from 'src/features/licenses'
import * as m from '@paraglide/message'
import {PTag} from '../PTag'

const CREDIT_ITEM_CLASS = cx(
  'rounded-panel border border-solid border-content-border',
  'bg-content-surface px-4 py-3',
)

const LICENSE_SOURCE_SUFFIX = ' 라이선스 원문'
const OFFICIAL_REPOSITORY_SUFFIX = ' 공식 저장소'

const getLicenseLinkLabel = (label: string): string => {
  if (label.endsWith(LICENSE_SOURCE_SUFFIX)) {
    return m.credits_license_source({name: label.slice(0, -LICENSE_SOURCE_SUFFIX.length)})
  }

  if (label.endsWith(OFFICIAL_REPOSITORY_SUFFIX)) {
    return m.credits_official_repository({
      name: label.slice(0, -OFFICIAL_REPOSITORY_SUFFIX.length),
    })
  }

  return label
}

export const CreditList = (props: {readonly entries: ReadonlyArray<LicenseEntry>}) => (
  <ul class="m-0 grid list-none gap-3 p-0">
    <For each={props.entries}>
      {(entry) => (
        <li class={CREDIT_ITEM_CLASS}>
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h4 class="m-0 text-sm font-750 text-foreground">{entry.summaryName ?? entry.name}</h4>
            <PTag tone="highlight">{entry.license}</PTag>
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
                  {getLicenseLinkLabel(link.label)}
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
