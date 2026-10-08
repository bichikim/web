import {createMemo, createSignal, Show} from 'solid-js'
import {SSelect} from '../SSelect'
import {STableDocument} from '../STableDocument'
import type {SpreadsheetSheet} from './types'

interface SSpreadsheetDocumentProps {
  sheets: readonly SpreadsheetSheet[]
}
export const SSpreadsheetDocument = (props: SSpreadsheetDocumentProps) => {
  const [selected, setSelected] = createSignal<string | null>(null)
  const sheet = createMemo(
    () => props.sheets.find((entry) => entry.name === selected()) ?? props.sheets[0],
  )
  return (
    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div class="flex shrink-0 flex-wrap items-center gap-3 border-b border-divider px-4 py-2">
        <div class="flex min-w-0 items-center gap-2 text-sm">
          <span>시트</span>
          <SSelect
            label="시트 선택"
            options={props.sheets.map((entry) => entry.name)}
            value={sheet()?.name}
            onChange={setSelected}
          />
        </div>
        <span class="text-xs text-muted">셀 내용을 표시합니다. 수식은 다시 계산하지 않습니다.</span>
      </div>
      <Show
        when={sheet()}
        keyed
        fallback={
          <p role="status" class="m-0 p-4 text-sm text-muted">
            표시할 시트가 없습니다.
          </p>
        }
      >
        {(entry) => (
          <STableDocument
            data={entry}
            initialHeader={false}
            truncationMessage="시트는 처음 10,000행·100열까지 표시합니다."
          />
        )}
      </Show>
    </div>
  )
}
