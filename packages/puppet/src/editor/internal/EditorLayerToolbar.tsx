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
      title="그룹 만들기"
      type="button"
      onClick={props.onGroupCreate}
    >
      <svg aria-hidden="true" class="layer-toolbar-icon" viewBox="0 0 16 16">
        <path d="M1.5 4.5h5l1.5 2h6.5v7h-13z" />
        <path d="M10.5 8.5v3M9 10h3" />
      </svg>
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
      ↑
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
      ↓
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
      <svg aria-hidden="true" class="layer-toolbar-icon" viewBox="0 0 16 16">
        <path d="M7 4h7M7 8h7M7 12h7M5 6 3 8l2 2" />
      </svg>
    </Button>
  </div>
)
