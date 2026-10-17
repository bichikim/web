import {useCodeFolding} from './use-code-folding'
import {useTranslations} from './locale/use-translations'
import {createEffect, createSignal, For, onCleanup, Show, untrack} from 'solid-js'
import type {CodeDocument, CodeToken} from '../shared/contracts'
import type {CodeSelection, CodeTextRange, NavigationPoint} from './types'
import {SCodeLine} from './SCodeLine'
import {useScrollRestoration} from './use-scroll-restoration'
import {useCodeInteraction} from './use-code-interaction'
import type {TextMatch} from './find-text'
import {useCodeContextMenu} from './use-code-context-menu'
import {SCodeContextMenu} from './SCodeContextMenu'

export interface SCodeDocumentProps {
  document: CodeDocument
  onFollow: (token: CodeToken, point?: NavigationPoint) => void
  onSelect?: (anchor: number, focus: number) => void
  onSelectText?: (range: CodeTextRange) => void
  selection?: CodeSelection
  matches?: readonly TextMatch[]
  activeMatch?: number
  searchScrollRequest?: number
  onCopy?: (text: string) => void
  onShare?: (selection: CodeSelection) => void
  onFind?: (text?: string) => void
}

export const SCodeDocument = (props: SCodeDocumentProps) => {
  const t = useTranslations()
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const folds = useCodeFolding({
    active: () => props.activeMatch,
    document: () => props.document,
    matches: () => props.matches,
    searchRequest: () => props.searchScrollRequest,
    selection: () => props.selection,
  })
  const scroll = useScrollRestoration({
    content: () => props.document,
    element,
    kind: 'codeScroll',
    onLocate: (container) =>
      container
        .querySelector(`[data-line="${props.document.location.line}"]`)
        ?.scrollIntoView({block: 'center', inline: 'nearest'}),
  })
  const interaction = useCodeInteraction({
    container: element,
    document: () => props.document,
    onFollow: (token, point) => props.onFollow(token, point),
    onSelect: (line, endLine) => props.onSelect?.(line, endLine),
    onSelectText: (range) => props.onSelectText?.(range),
    selectable: () => props.onSelect !== undefined,
    selection: () => props.selection,
  })
  const menu = useCodeContextMenu({
    container: element,
    document: () => props.document,
    onSelect: interaction.selectRange,
    onSelectText: interaction.selectText,
    selection: () => props.selection,
  })
  createEffect(() => {
    props.searchScrollRequest
    const active = untrack(() => props.activeMatch)
    const container = element()
    let disposed = false
    onCleanup(() => {
      disposed = true
    })
    queueMicrotask(() => {
      if (!disposed) {
        container
          ?.querySelector(`[data-search-match="${active}"]`)
          ?.scrollIntoView({block: 'center', inline: 'nearest'})
      }
    })
  })
  const handleKeyboard = (event: KeyboardEvent): void => {
    menu.handleKeyboard(event)
    if (!event.defaultPrevented) {
      interaction.handleKeyboard(event)
    }
  }
  return (
    <>
      <div
        data-code-source
        aria-label={t('소스 코드')}
        class="min-h-0 flex-1 overflow-auto bg-canvas"
        onScroll={scroll.record}
        onClick={interaction.handleClick}
        onContextMenu={menu.handleContextMenu}
        onKeyDown={handleKeyboard}
        onLostPointerCapture={interaction.handlePointerEnd}
        onPointerCancel={interaction.handlePointerEnd}
        onPointerDown={interaction.handlePointerDown}
        onPointerMove={interaction.handlePointerMove}
        onPointerUp={interaction.handlePointerEnd}
        ref={setElement}
      >
        <pre class="ui-code-text m-0 w-max min-w-full pb-4 selection:bg-code-selection">
          <For each={folds.visible()}>
            {(row) => (
              <SCodeLine
                focusable={row.line === (props.selection?.line ?? props.document.location.line)}
                line={row.line}
                selectable={props.onSelect !== undefined}
                selected={interaction.selected(row.line)}
                tokens={row.tokens}
                folding={folds.ranges().size > 0}
                foldEnd={folds.ranges().get(row.line)}
                collapsed={folds.closed().has(row.line)}
                onToggleFold={() => folds.toggle(row.line)}
                matches={props.matches}
                activeMatch={props.activeMatch}
              />
            )}
          </For>
        </pre>
      </div>
      <Show when={menu.context()} keyed>
        {(context) => (
          <SCodeContextMenu
            x={context.x}
            y={context.y}
            onClose={menu.close}
            onCopy={props.onCopy === undefined ? undefined : () => props.onCopy?.(context.text)}
            onFind={props.onFind === undefined ? undefined : () => props.onFind?.(context.text)}
            onShare={
              props.onShare === undefined ? undefined : () => props.onShare?.(context.selection)
            }
          />
        )}
      </Show>
    </>
  )
}
