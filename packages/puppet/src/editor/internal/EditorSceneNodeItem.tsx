import type {LayerClipboard} from './use-layer-clipboard'
import {EditorLayerRowMenu} from './EditorLayerRowMenu'
import {SceneNodeSelect} from './SceneNodeSelect'
import {KeyedFor} from './KeyedFor'
import {Collapsible} from '@kobalte/core/collapsible'
import {createMemo, createSignal, Show} from 'solid-js'
import {isSceneContainerNode, type PuppetDocument, type PuppetSceneNode} from '../../player'
import {EditorLayerStateActions} from './EditorLayerStateActions'
import {EditorLayerTreeToggle} from './EditorLayerTreeToggle'
import {getLayerDropPosition, type LayerDropTarget} from './layer-drop'
import {isLayerMaskPickDisabled} from './layer-mask'
import {getMaskUsageCount} from './mask-usage'
import {
  getBindingParameters,
  getDocumentParameterBindings,
  getParameterTargetNodeIds,
} from './parameter-keyforms'
import {getParameterSelectionNodeIds} from './parameter-targets'

interface EditorSceneNodeItemProps {
  readonly clipboard: LayerClipboard
  readonly visibleNodeIds?: ReadonlySet<string>
  readonly depth: number
  readonly document: PuppetDocument
  readonly draggedNodeId: string | null
  readonly dropTarget: LayerDropTarget | null
  readonly expandedGroupIds: ReadonlySet<string>
  readonly inheritedLocked: boolean
  readonly inheritedVisible: boolean
  readonly maskPickSourcePartId?: string
  readonly node: PuppetSceneNode
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onDragOver: (target: LayerDropTarget) => void
  readonly onDragStart: (nodeId: string) => void
  readonly onDrop: (target: LayerDropTarget) => void
  readonly onSelect: (event: MouseEvent, node: PuppetSceneNode) => void
  readonly onToggleExpanded: (groupId: string) => void
  readonly selectedNodeIds: ReadonlySet<string>
}

const getNodeParameterLinks = (document: PuppetDocument, nodeId: string) => {
  const nodeIds = getParameterSelectionNodeIds({
    document,
    selection: {activeNodeId: nodeId, nodeIds: [nodeId]},
  })

  return getDocumentParameterBindings(document).flatMap((binding) => {
    const targetNodeIds = new Set(getParameterTargetNodeIds(binding))
    const linkedNodeCount = nodeIds.filter((candidate) => targetNodeIds.has(candidate)).length

    if (linkedNodeCount === 0) {
      return []
    }

    const name = getBindingParameters(document, binding)
      .map((parameter) => parameter.name)
      .join(' / ')
    return [linkedNodeCount === nodeIds.length ? name : `${name} 일부`]
  })
}

const getNodeDropTarget = (
  node: PuppetSceneNode,
  event: DragEvent & {currentTarget: HTMLElement},
): LayerDropTarget => ({
  nodeId: node.id,
  position: getLayerDropPosition(node, event.currentTarget.getBoundingClientRect(), event.clientY),
})

const handleLayerDragStart = (
  event: DragEvent,
  nodeId: string,
  onDragStart: (nodeId: string) => void,
) => {
  event.stopPropagation()
  event.dataTransfer?.setData('text/plain', nodeId)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
  onDragStart(nodeId)
}

export const EditorSceneNodeItem = (props: EditorSceneNodeItemProps) => {
  const [renameRequest, setRenameRequest] = createSignal(0)
  const [renaming, setRenaming] = createSignal(false)
  const isExpanded = () =>
    isSceneContainerNode(props.node) && props.expandedGroupIds.has(props.node.id)
  const retainChildren = createMemo((retained: boolean) => retained || isExpanded(), false)
  const locked = () => props.inheritedLocked || props.node.locked
  const visible = () => props.inheritedVisible && props.node.visible
  const parameterLinks = createMemo(() => getNodeParameterLinks(props.document, props.node.id))
  const maskPickDisabled = () =>
    isLayerMaskPickDisabled({
      document: props.document,
      maskPartId: props.maskPickSourcePartId,
      node: props.node,
    })
  const maskUsageCount = () => getMaskUsageCount(props.document, props.node.id)
  const dropPosition = () =>
    props.dropTarget?.nodeId === props.node.id ? props.dropTarget.position : null

  return (
    <Show when={props.visibleNodeIds === undefined || props.visibleNodeIds.has(props.node.id)}>
      <li
        aria-expanded={isSceneContainerNode(props.node) ? isExpanded() : undefined}
        aria-level={props.depth}
        aria-selected={props.selectedNodeIds.has(props.node.id)}
        class="layer-tree-item puppet-layer-tree-item"
        classList={{dragging: props.draggedNodeId === props.node.id}}
        draggable={!locked() && props.maskPickSourcePartId === undefined}
        role="treeitem"
        onDragEnd={() => props.onDragStart('')}
        onDragStart={(event) => handleLayerDragStart(event, props.node.id, props.onDragStart)}
      >
        <Collapsible
          forceMount={retainChildren()}
          class="layer-tree-node"
          open={isExpanded()}
          onOpenChange={() => {
            if (isSceneContainerNode(props.node)) {
              props.onToggleExpanded(props.node.id)
            }
          }}
        >
          <EditorLayerRowMenu
            clipboard={props.clipboard}
            disabled={props.maskPickSourcePartId !== undefined || renaming()}
            editable={props.onDocumentChange !== undefined}
            locked={locked()}
            node={props.node}
            selected={props.selectedNodeIds.has(props.node.id)}
            onSelect={props.onSelect}
            onRename={() => setRenameRequest((request) => request + 1)}
          >
            <div
              class="layer-row"
              classList={{
                'drop-after': dropPosition() === 'after',
                'drop-before': dropPosition() === 'before',
                'drop-inside': dropPosition() === 'inside',
              }}
              style={{'--layer-depth': props.depth - 1}}
              onDragOver={(event) => {
                if (props.draggedNodeId === null) {
                  return
                }

                event.preventDefault()
                event.stopPropagation()
                if (event.dataTransfer) {
                  event.dataTransfer.dropEffect = 'move'
                }
                props.onDragOver(getNodeDropTarget(props.node, event))
              }}
              onDrop={(event) => {
                if (props.draggedNodeId === null) {
                  return
                }

                event.preventDefault()
                event.stopPropagation()
                props.onDrop(getNodeDropTarget(props.node, event))
              }}
            >
              <Show
                when={isSceneContainerNode(props.node)}
                fallback={
                  <span class="layer-tree-spacer puppet-layer-tree-spacer" aria-hidden="true" />
                }
              >
                <EditorLayerTreeToggle expanded={isExpanded()} name={props.node.name} />
              </Show>

              <SceneNodeSelect
                onRenamingChange={setRenaming}
                renameRequest={renameRequest()}
                document={props.document}
                locked={locked()}
                maskPickDisabled={maskPickDisabled()}
                maskPicking={props.maskPickSourcePartId !== undefined}
                maskUsageCount={maskUsageCount()}
                node={props.node}
                parameterLinks={parameterLinks()}
                selected={props.selectedNodeIds.has(props.node.id)}
                onDocumentChange={props.onDocumentChange}
                onSelect={props.onSelect}
              />

              <EditorLayerStateActions
                document={props.document}
                inheritedLocked={props.inheritedLocked}
                locked={locked()}
                node={props.node}
                visible={visible()}
                onDocumentChange={props.onDocumentChange}
              />
            </div>
          </EditorLayerRowMenu>

          <Show when={isSceneContainerNode(props.node)}>
            <Collapsible.Content hidden={!isExpanded()} inert={!isExpanded()}>
              <ul role="group">
                <KeyedFor
                  each={isSceneContainerNode(props.node) ? props.node.children.toReversed() : []}
                  key={(node) => node.id}
                >
                  {(node) => (
                    <EditorSceneNodeItem
                      clipboard={props.clipboard}
                      visibleNodeIds={props.visibleNodeIds}
                      depth={props.depth + 1}
                      document={props.document}
                      draggedNodeId={props.draggedNodeId}
                      dropTarget={props.dropTarget}
                      expandedGroupIds={props.expandedGroupIds}
                      inheritedLocked={locked()}
                      inheritedVisible={visible()}
                      maskPickSourcePartId={props.maskPickSourcePartId}
                      node={node()}
                      onDocumentChange={props.onDocumentChange}
                      onDragOver={props.onDragOver}
                      onDragStart={props.onDragStart}
                      onDrop={props.onDrop}
                      onSelect={props.onSelect}
                      onToggleExpanded={props.onToggleExpanded}
                      selectedNodeIds={props.selectedNodeIds}
                    />
                  )}
                </KeyedFor>
              </ul>
            </Collapsible.Content>
          </Show>
        </Collapsible>
      </li>
    </Show>
  )
}
