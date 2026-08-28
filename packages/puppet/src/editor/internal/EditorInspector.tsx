import {createUniqueId, Show} from 'solid-js'

import type {PuppetDocument} from '../../player/document'

export interface EditorInspectorProps {
  readonly activePartId?: string
  readonly notice?: string | null
  readonly document: PuppetDocument
}

const INDICES_PER_TRIANGLE = 3

export const EditorInspector = (props: EditorInspectorProps) => {
  const titleId = createUniqueId()
  const activePart = () =>
    props.activePartId === undefined
      ? props.document.parts[0]
      : props.document.parts.find((part) => part.id === props.activePartId)

  return (
    <aside class="panel inspector-panel" aria-labelledby={titleId}>
      <div class="panel-heading">
        <h2 id={titleId}>Inspector</h2>
      </div>
      <dl class="property-list">
        <div>
          <dt>Renderer</dt>
          <dd>PixiJS 8</dd>
        </div>
        <div>
          <dt>Format</dt>
          <dd>{props.document.format}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{props.document.version}</dd>
        </div>
        <div>
          <dt>Part</dt>
          <dd>{activePart()?.id ?? '—'}</dd>
        </div>
        <div>
          <dt>Triangles</dt>
          <dd>{(activePart()?.mesh.indices.length ?? 0) / INDICES_PER_TRIANGLE}</dd>
        </div>
      </dl>
      <p class="panel-note">PNG 메시 정점을 편집한 뒤 JSON으로 저장할 수 있습니다.</p>
      <Show when={props.notice}>{(message) => <p class="notice">{message()}</p>}</Show>
    </aside>
  )
}
