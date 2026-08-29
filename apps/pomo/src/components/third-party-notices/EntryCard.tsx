import {For} from 'solid-js'
import {type LicenseEntry} from 'src/features/licenses'
import {LINK_CLASSES} from './shared'

export const NoticeEntryCard = (props: {readonly entry: LicenseEntry}) => (
  <li class="rounded-5 border border-white/8 bg-white/[0.035] p-5">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
      <h3 class="m-0 text-base font-750 text-#f8edf1">{props.entry.name}</h3>
      <span class="text-xs font-750 text-#f2a7b8">{props.entry.license}</span>
    </div>
    <dl class="mb-0 mt-4 grid gap-3 text-sm leading-6">
      <div class="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3">
        <dt class="font-700 text-#a99cab">사용 범위</dt>
        <dd class="m-0 text-#d8cbd9">{props.entry.use}</dd>
      </div>
      <div class="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3">
        <dt class="font-700 text-#a99cab">배포 조치</dt>
        <dd class="m-0 text-#d8cbd9">{props.entry.condition}</dd>
      </div>
    </dl>
    <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
      <For each={props.entry.links}>
        {(link) => (
          <a class={LINK_CLASSES} href={link.url} rel="noreferrer" target="_blank">
            {link.label}
            <span class="sr-only"> 새 창에서 열기</span>
          </a>
        )}
      </For>
    </div>
  </li>
)
