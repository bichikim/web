import {createEffect, createMemo, createSignal, createUniqueId, on, Show} from 'solid-js'
import {cx} from 'class-variance-authority'
import type {DeletedDocument, InlineChange} from './types'
import type {TextMatch} from './find-text'
import {SChangePanel} from './SChangePanel'
import {createEditorOffsets} from './editor/create-editor-offsets'
import {useTranslations} from './locale/use-translations'

interface SDeletedOriginalProps {
  readonly document: DeletedDocument
  readonly class?: string
  readonly readOnlyLabel?: boolean
  readonly matches?: readonly TextMatch[]
  readonly activeMatch?: number
  readonly searchScrollRequest?: number
  readonly onFind?: (text?: string) => void
  readonly onSave?: () => void
}

export const SDeletedOriginal = (props: SDeletedOriginalProps) => {
  const t = useTranslations()
  const [expanded, setExpanded] = createSignal(false)
  const path = createMemo(() => props.document.path)
  const source = createMemo(() => props.document.source)
  const contentId = createUniqueId()
  const [toggle, setToggle] = createSignal<HTMLButtonElement | null>(null)
  const inspection = createMemo<InlineChange>(() => ({
    active: 0,
    base: props.document.base,
    hunks: [
      {
        kind: 'deleted',
        newLines: [],
        newStart: 1,
        oldLines:
          props.document.source === '' ? [] : (props.document.source ?? '').split(/\r\n|\r|\n/u),
        oldStart: 1,
      },
    ],
    path: props.document.path,
    source: '',
  }))
  const matches = createMemo(() => {
    const offsets = createEditorOffsets(props.document.source ?? '')
    return props.matches?.map((match) => ({
      end: offsets.toEditor(match.end),
      start: offsets.toEditor(match.start),
    }))
  })
  const lineDigits = createMemo(() =>
    Math.max(2, String((props.document.source ?? '').split(/\r\n|\r|\n/u).length).length),
  )
  const toggleLabel = () => t(expanded() ? '삭제된 내용 접기' : '삭제된 내용 펼치기')
  const handleToggle = (): void => {
    setExpanded((previous) => !previous)
  }
  const handleClose = (): void => {
    setExpanded(false)
    toggle()?.focus({preventScroll: true})
  }
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (!(event.metaKey || event.ctrlKey) || event.isComposing) {
      return
    }
    const key = event.key.toLowerCase()
    if (key === 'f' && props.onFind !== undefined) {
      event.preventDefault()
      props.onFind(globalThis.getSelection()?.toString() || undefined)
    } else if (key === 's' && props.onSave !== undefined) {
      event.preventDefault()
      props.onSave()
    }
  }
  createEffect(on([path, source], () => setExpanded(false)))
  createEffect(
    on(
      [() => props.activeMatch ?? -1, () => props.searchScrollRequest ?? 0, () => props.matches],
      ([active, request]) => {
        if (active >= 0 && request > 0) {
          setExpanded(true)
        }
      },
    ),
  )
  return (
    <div
      class={cx(
        'ui-code-text flex min-h-0 flex-col bg-canvas [container-type:inline-size]',
        props.class,
      )}
      style={{'--code-number-width': `${lineDigits()}ch`}}
    >
      <div class="flex h-6 shrink-0 items-center">
        <span aria-hidden="true" class="ui-code-gutter shrink-0" />
        <button
          type="button"
          class="ui-focus inline-flex h-6 w-6 shrink-0 items-center bg-transparent p-0"
          aria-label={toggleLabel()}
          title={toggleLabel()}
          aria-expanded={expanded()}
          aria-controls={contentId}
          data-document-focus
          onClick={handleToggle}
          ref={setToggle}
        >
          <span
            aria-hidden="true"
            class="ui-change-mark"
            classList={{'rotate-90': expanded()}}
            data-change="deleted"
          />
        </button>
      </div>
      <div
        id={contentId}
        role="region"
        aria-label={t('삭제된 원문')}
        hidden={!expanded()}
        class="ui-change-inset min-h-0 overflow-auto"
        onKeyDown={handleKeyboard}
      >
        <Show when={expanded()}>
          <SChangePanel
            inspection={inspection()}
            rowLimit={Infinity}
            lineLimit={Infinity}
            readOnlyLabel={props.readOnlyLabel}
            autofocus={false}
            matches={matches()}
            activeMatch={props.activeMatch}
            searchScrollRequest={props.searchScrollRequest}
            onClose={handleClose}
          />
        </Show>
      </div>
    </div>
  )
}
