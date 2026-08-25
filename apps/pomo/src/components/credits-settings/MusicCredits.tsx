import {createSignal, For, Show} from 'solid-js'

export interface PMusicCredit {
  readonly artistName: string
  readonly contributorName: string
  readonly role: string
}

export interface PMusicCreditsProps {
  readonly entries: ReadonlyArray<PMusicCredit>
}

const PREVIEW_CREDIT_COUNT = 4
const MUSIC_CREDIT_LIST_ID = 'pomo-music-credit-list'

export const PMusicCredits = (props: PMusicCreditsProps) => {
  const [isExpanded, setIsExpanded] = createSignal(false)
  const hasMoreCredits = () => props.entries.length > PREVIEW_CREDIT_COUNT
  const hiddenCreditCount = () => props.entries.length - PREVIEW_CREDIT_COUNT
  const visibleCredits = () =>
    isExpanded() ? props.entries : props.entries.slice(0, PREVIEW_CREDIT_COUNT)

  return (
    <>
      <ul class="m-0 grid list-none gap-3 p-0" id={MUSIC_CREDIT_LIST_ID}>
        <For each={visibleCredits()}>
          {(credit) => (
            <li class="flex min-w-0 items-center gap-3 rounded-4 bg-secondary-soft px-4 py-3">
              <span aria-hidden="true" class="i-tabler-music size-4 shrink-0 text-highlight" />
              <div class="min-w-0">
                <h4 class="m-0 truncate text-sm font-750 text-foreground">{credit.artistName}</h4>
                <p class="mb-0 mt-0.5 text-xs font-600 leading-5 text-muted-foreground">
                  {credit.contributorName} · {credit.role}
                </p>
              </div>
            </li>
          )}
        </For>
      </ul>

      <Show when={hasMoreCredits()}>
        <button
          aria-controls={MUSIC_CREDIT_LIST_ID}
          aria-expanded={isExpanded()}
          class="flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-3 border-0
            bg-transparent px-3 text-xs font-650 text-highlight outline-none transition-colors
            hover:bg-surface focus-visible:shadow-focus motion-reduce:transition-none"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          type="button"
        >
          <span>{isExpanded() ? '접기' : `모두 보기 (+${hiddenCreditCount()})`}</span>
          <span
            aria-hidden="true"
            class={isExpanded() ? 'i-tabler-chevron-up size-4' : 'i-tabler-chevron-down size-4'}
          />
        </button>
      </Show>
    </>
  )
}
