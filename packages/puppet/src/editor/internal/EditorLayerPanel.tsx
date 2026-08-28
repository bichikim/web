import {createUniqueId, For, Show} from 'solid-js'

import type {PuppetDocument} from '../../player/document'

export interface EditorLayerPanelProps {
  readonly activePartId?: string
  readonly document: PuppetDocument
  readonly onPartSelect?: (partId: string) => void
}

export const EditorLayerPanel = (props: EditorLayerPanelProps) => {
  const titleId = createUniqueId()

  return (
    <aside class="panel layers-panel" aria-labelledby={titleId}>
      <div class="panel-heading">
        <h2 id={titleId}>Layers</h2>
        <span>{props.document.parts.length}</span>
      </div>
      <Show
        when={props.document.parts.length > 0}
        fallback={<p class="panel-note">PNG를 불러오세요.</p>}
      >
        <div class="layer-list">
          <For each={props.document.parts}>
            {(part) => (
              <button
                class="layer-item"
                type="button"
                aria-pressed={props.activePartId === part.id}
                onClick={() => props.onPartSelect?.(part.id)}
              >
                <span class="layer-thumbnail" aria-hidden="true">
                  <img alt="" src={part.texture.src} />
                </span>
                <span>
                  <strong>{part.id}</strong>
                  <small>{part.mesh.vertices.length / 2} vertices</small>
                </span>
              </button>
            )}
          </For>
        </div>
      </Show>
      <p class="panel-note">편집 결과는 버전이 있는 JSON 문서로 저장됩니다.</p>
    </aside>
  )
}
