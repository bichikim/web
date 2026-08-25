import {For} from 'solid-js'
import {type LicenseGroup} from 'src/features/licenses'
import {NoticeEntryCard} from './EntryCard'

export const NoticeGroupSection = (props: {readonly group: LicenseGroup}) => (
  <section aria-labelledby={`${props.group.id}-title`} class="scroll-mt-8" id={props.group.id}>
    <h2 class="m-0 text-xl font-750 tracking--0.02em" id={`${props.group.id}-title`}>
      {props.group.title}
    </h2>
    <p class="mb-0 mt-2 text-sm leading-6 text-#bdb2c4">{props.group.description}</p>
    <ul class="mb-0 mt-5 grid list-none gap-3 p-0">
      <For each={props.group.entries}>{(entry) => <NoticeEntryCard entry={entry} />}</For>
    </ul>
  </section>
)
