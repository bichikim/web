import {For, Show} from 'solid-js'
import type {DocumentNode} from './types'
import {SDocumentNode} from './SDocumentNode'

interface SWordDocumentProps {
  nodes: readonly DocumentNode[]
  warnings?: readonly string[]
}
export const SWordDocument = (props: SWordDocumentProps) => (
  <article
    aria-label="DOCX 미리보기"
    class="min-h-0 flex-1 overflow-auto px-6 py-3 text-sm leading-7"
  >
    <div class="mx-auto max-w-3xl break-words">
      <Show when={(props.warnings?.length ?? 0) > 0}>
        <details class="my-3 text-xs text-muted">
          <summary>문서 변환 안내 ({props.warnings?.length})</summary>
          <ul class="list-disc pl-5">
            <For each={props.warnings}>{(warning) => <li>{warning}</li>}</For>
          </ul>
        </details>
      </Show>
      <Show when={props.nodes.length > 0} fallback={<p role="status">표시할 내용이 없습니다.</p>}>
        <For each={props.nodes}>{(node) => <SDocumentNode node={node} />}</For>
      </Show>
    </div>
  </article>
)
