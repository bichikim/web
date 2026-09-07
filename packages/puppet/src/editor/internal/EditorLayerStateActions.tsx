import {ToggleButton} from '@kobalte/core/toggle-button'
import {Show} from 'solid-js'

import type {PuppetDocument, PuppetSceneNode} from '../../player'
import {setSceneNodeState} from './scene-graph'

export interface EditorLayerStateActionsProps {
  readonly document: PuppetDocument
  readonly inheritedLocked: boolean
  readonly locked: boolean
  readonly node: PuppetSceneNode
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly visible: boolean
}

export const EditorLayerStateActions = (props: EditorLayerStateActionsProps) => (
  <div class="layer-state-actions puppet-layer-state-actions">
    <ToggleButton
      aria-label={`${props.node.name} ${props.node.visible ? '숨기기' : '표시하기'}`}
      pressed={props.visible}
      title={props.node.visible ? '숨기기' : '표시하기'}
      onClick={() => {
        const document = setSceneNodeState({
          document: props.document,
          nodeId: props.node.id,
          visible: !props.node.visible,
        })
        if (document !== undefined) {
          props.onDocumentChange?.(document)
        }
      }}
    >
      <Show
        when={props.node.visible}
        fallback={
          <span
            aria-hidden="true"
            class="puppet-icon puppet-icon-eye-off puppet-layer-state-icon"
          />
        }
      >
        <span aria-hidden="true" class="puppet-icon puppet-icon-eye puppet-layer-state-icon" />
      </Show>
    </ToggleButton>
    <ToggleButton
      aria-label={`${props.node.name} ${props.node.locked ? '잠금 해제' : '잠그기'}`}
      disabled={props.inheritedLocked}
      pressed={props.locked}
      title={
        props.inheritedLocked ? '상위 레이어에서 잠김' : props.node.locked ? '잠금 해제' : '잠그기'
      }
      onClick={() => {
        const document = setSceneNodeState({
          document: props.document,
          locked: !props.node.locked,
          nodeId: props.node.id,
        })
        if (document !== undefined) {
          props.onDocumentChange?.(document)
        }
      }}
    >
      <Show
        when={props.locked}
        fallback={
          <span
            aria-hidden="true"
            class="puppet-icon puppet-icon-lock-open puppet-layer-state-icon"
          />
        }
      >
        <span aria-hidden="true" class="puppet-icon puppet-icon-lock puppet-layer-state-icon" />
      </Show>
    </ToggleButton>
  </div>
)
