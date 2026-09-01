import {ToggleButton} from '@kobalte/core/toggle-button'

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
  <div class="layer-state-actions">
    <ToggleButton
      aria-label={`${props.node.name} ${props.node.visible ? '숨기기' : '표시하기'}`}
      pressed={props.visible}
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
      {props.node.visible ? '●' : '○'}
    </ToggleButton>
    <ToggleButton
      aria-label={`${props.node.name} ${props.node.locked ? '잠금 해제' : '잠그기'}`}
      disabled={props.inheritedLocked}
      pressed={props.locked}
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
      {props.node.locked ? '◆' : '◇'}
    </ToggleButton>
  </div>
)
