import type {Component} from 'solid-js'
import type {NodeProps} from '@dschz/solid-flow'
import {EditorContextMenu} from '../../editor/internal/EditorContextMenu'
import {useMappingGraph} from './context'
export const withGraphCardMenu =
  (Card: Component<NodeProps>): Component<NodeProps> =>
  (props) => {
    const graph = useMappingGraph()
    return (
      <EditorContextMenu
        triggerClass="block h-full w-full"
        label="카드 작업"
        onContextMenu={(event) => event.stopPropagation()}
        entries={[
          {
            id: 'delete',
            label: '삭제',
            onSelect: () => graph.onDeleteCard(props.id),
            tone: 'danger',
            type: 'action',
          },
        ]}
      >
        <Card {...props} />
      </EditorContextMenu>
    )
  }
