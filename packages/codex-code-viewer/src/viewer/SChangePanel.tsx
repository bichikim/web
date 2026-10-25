import {createMemo, createSignal, onMount, Show, untrack} from 'solid-js'
import type {InlineChange} from './types'
import {createChangeRows} from './create-change-rows'
import {SChangeTable} from './SChangeTable'
import type {TextMatch} from './find-text'
import {useTranslations} from './locale/use-translations'

interface SChangePanelProps {
  readonly inspection: InlineChange
  readonly rowLimit?: number
  readonly lineLimit?: number
  readonly readOnlyLabel?: boolean
  readonly autofocus?: boolean
  readonly matches?: readonly TextMatch[]
  readonly activeMatch?: number
  readonly searchScrollRequest?: number
  readonly onClose: () => void
  readonly onNavigate?: (index: number) => void
}
const MAX_ROWS = 500
const MAX_LINE_LENGTH = 4000

export const SChangePanel = (props: SChangePanelProps) => {
  const t = useTranslations()
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  onMount(() => {
    const panel = untrack(element)
    const autofocus = untrack(() => props.autofocus !== false)
    queueMicrotask(() => {
      if (panel?.isConnected && autofocus) {
        panel.focus({preventScroll: true})
        panel.scrollIntoView?.({block: 'nearest', inline: 'nearest'})
      }
    })
  })
  const rows = createMemo(() => createChangeRows(props.inspection))
  const visible = createMemo(() =>
    rows()
      .slice(0, props.rowLimit ?? MAX_ROWS)
      .map((row) => ({...row, text: row.text.slice(0, props.lineLimit ?? MAX_LINE_LENGTH)})),
  )
  const move = (offset: number): void => {
    const {active, hunks} = props.inspection
    props.onNavigate?.((active + offset + hunks.length) % hunks.length)
  }
  const handlePrevious = (): void => move(-1)
  const handleNext = (): void => move(1)
  const handleClose = (): void => props.onClose()
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      handleClose()
    }
  }
  return (
    <section
      role="region"
      aria-label={t('변경 사항')}
      tabindex={-1}
      ref={setElement}
      class="ui-code-syntax min-w-0 whitespace-normal border-y border-change-modified
        bg-canvas text-foreground outline-none data-[change=deleted]:border-change-deleted
        data-[change=added]:border-change-added"
      onKeyDown={handleKeyboard}
      data-change={props.inspection.hunks[props.inspection.active]?.kind}
    >
      <header class="flex h-9 items-center gap-2 border-b border-divider bg-surface px-3 font-sans text-xs">
        <span class="min-w-0 flex-1 truncate" title={props.inspection.path}>
          {props.inspection.path.split('/').at(-1)}
          <span class="ml-2 text-muted">
            {props.inspection.active + 1} / {props.inspection.hunks.length}
          </span>
        </span>
        <Show when={props.readOnlyLabel}>
          <span class="text-muted">{t('읽기 전용')}</span>
        </Show>
        <Show when={props.inspection.hunks.length > 1 && props.onNavigate !== undefined}>
          <button
            type="button"
            class="ui-icon-button"
            aria-label={t('이전 변경 사항')}
            onClick={handlePrevious}
          >
            <span aria-hidden="true" class="i-tabler-arrow-up" />
          </button>
          <button
            type="button"
            class="ui-icon-button"
            aria-label={t('다음 변경 사항')}
            onClick={handleNext}
          >
            <span aria-hidden="true" class="i-tabler-arrow-down" />
          </button>
        </Show>
        <button
          type="button"
          class="ui-icon-button"
          aria-label={t('변경 사항 닫기')}
          onClick={handleClose}
        >
          <span aria-hidden="true" class="i-tabler-x" />
        </button>
      </header>
      <SChangeTable
        rows={visible()}
        path={props.inspection.path}
        matches={props.matches}
        activeMatch={props.activeMatch}
        searchScrollRequest={props.searchScrollRequest}
      />
      <Show when={rows().length > (props.rowLimit ?? MAX_ROWS)}>
        <p class="m-0 px-3 py-1 font-sans text-xs text-muted">
          {t('처음 {count}개의 변경 줄을 표시합니다.', {count: props.rowLimit ?? MAX_ROWS})}
        </p>
      </Show>
    </section>
  )
}
