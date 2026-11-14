import {createEffect, createMemo, Index, Show} from 'solid-js'
import {EditorButton} from '../../design-system'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import type {ModelHistoryEntry as DocumentHistoryEntry} from '../model'

interface DocumentHistoryPanelProps {
  readonly entries: ReadonlyArray<DocumentHistoryEntry>
  readonly onSelect: (id: number) => void
}

export const DocumentHistoryPanel = (props: DocumentHistoryPanelProps) => {
  const entries = createMemo(() => props.entries.toReversed())
  let list: HTMLOListElement | undefined
  createEffect(() => {
    const current = entries().findIndex((entry) => entry.state === 'current')
    const entry = list?.children.item(current)
    if (list === undefined || entry === null || entry === undefined) {
      return
    }
    const viewport = list.getBoundingClientRect()
    const row = entry.getBoundingClientRect()
    const offset =
      row.top < viewport.top ? row.top - viewport.top : Math.max(0, row.bottom - viewport.bottom)
    list.scrollTop += offset
  })
  return (
    <section class="document-history-panel" aria-label="작업 기록">
      <EditorPropertyGroup title="작업 기록">
        <ol
          class="document-history-list"
          aria-label="작업 시점"
          ref={(element) => {
            list = element
          }}
        >
          <Index each={entries()}>
            {(entry) => (
              <li>
                <EditorButton
                  class="document-history-entry"
                  aria-label={entry().title}
                  aria-current={entry().state === 'current' ? 'step' : undefined}
                  data-history-state={entry().state}
                  title={entry().title}
                  onClick={() => props.onSelect(entry().id)}
                >
                  <span class="document-history-title">{entry().title}</span>
                  <Show when={entry().state === 'current'}>
                    <small aria-hidden="true">현재</small>
                  </Show>
                  <Show when={entry().state === 'future'}>
                    <small aria-hidden="true">다시 실행 가능</small>
                  </Show>
                </EditorButton>
              </li>
            )}
          </Index>
        </ol>
      </EditorPropertyGroup>
    </section>
  )
}
