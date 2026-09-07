import {Button} from '@kobalte/core/button'

import type {PuppetDocument} from '../../player'
import {moveSceneNodeBy, moveSceneNodeToParent, type SceneSelection} from './scene-graph'

interface EditorLayerToolbarProps {
  readonly activeLocked: boolean
  readonly document: PuppetDocument
  readonly onDocumentChange: (document: PuppetDocument | undefined) => void
  readonly onGroupCreate: () => void
  readonly selectionLocked: boolean
  readonly selection: SceneSelection
}

export const EditorLayerToolbar = (props: EditorLayerToolbarProps) => (
  <div class="layer-toolbar" aria-label="레이어 계층 편집">
    <Button
      aria-label="그룹"
      disabled={props.selectionLocked}
      title="일반 그룹 만들기"
      type="button"
      onClick={props.onGroupCreate}
    >
      <span
        aria-hidden="true"
        class="puppet-icon puppet-icon-squares layer-toolbar-icon puppet-layer-toolbar-icon"
      />
    </Button>
    <Button
      aria-label="선택 레이어 위로 이동"
      disabled={props.selection.activeNodeId === null || props.activeLocked}
      type="button"
      onClick={() => {
        const nodeId = props.selection.activeNodeId
        if (nodeId !== null) {
          props.onDocumentChange(moveSceneNodeBy(props.document, nodeId, -1))
        }
      }}
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-arrow-up puppet-layer-toolbar-icon" />
    </Button>
    <Button
      aria-label="선택 레이어 아래로 이동"
      disabled={props.selection.activeNodeId === null || props.activeLocked}
      type="button"
      onClick={() => {
        const nodeId = props.selection.activeNodeId
        if (nodeId !== null) {
          props.onDocumentChange(moveSceneNodeBy(props.document, nodeId, 1))
        }
      }}
    >
      <span
        aria-hidden="true"
        class="puppet-icon puppet-icon-arrow-down puppet-layer-toolbar-icon"
      />
    </Button>
    <Button
      aria-label="선택 레이어를 상위 컨테이너로 이동"
      disabled={props.selection.activeNodeId === null || props.activeLocked}
      title="상위 컨테이너로 이동"
      type="button"
      onClick={() => {
        const nodeId = props.selection.activeNodeId
        if (nodeId !== null) {
          props.onDocumentChange(moveSceneNodeToParent(props.document, nodeId))
        }
      }}
    >
      <span
        aria-hidden="true"
        class="puppet-icon puppet-icon-indent-decrease layer-toolbar-icon puppet-layer-toolbar-icon"
      />
    </Button>
  </div>
)
