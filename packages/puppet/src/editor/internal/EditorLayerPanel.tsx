import {Button} from '@kobalte/core/button'
import {Collapsible} from '@kobalte/core/collapsible'
import {TextField} from '@kobalte/core/text-field'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {createMemo, createSignal, createUniqueId, For, Show, untrack} from 'solid-js'

import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetSceneGroupNode,
  type PuppetSceneNode,
} from '../../player'
import {
  createSceneGroup,
  getSceneNode,
  getSceneNodePartIds,
  isSceneNodeLocked,
  moveSceneNode,
  moveSceneNodeBy,
  moveSceneNodeToParent,
  renameSceneGroup,
  type SceneSelection,
  setSceneNodeState,
  ungroupSceneNode,
} from './scene-graph'
import {getDocumentParameters, getParameterTargetPartIds} from './parameter-keyforms'

export interface EditorLayerPanelProps {
  readonly activePartId?: string
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onPartSelect?: (partId: string) => void
  readonly onSelectionChange?: (selection: SceneSelection) => void
  readonly selection?: SceneSelection
}

interface SceneNodeItemProps {
  readonly depth: number
  readonly document: PuppetDocument
  readonly draggedNodeId: string | null
  readonly expandedGroupIds: ReadonlySet<string>
  readonly inheritedLocked: boolean
  readonly inheritedVisible: boolean
  readonly node: PuppetSceneNode
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onDragStart: (nodeId: string) => void
  readonly onDrop: (node: PuppetSceneNode) => void
  readonly onSelect: (event: MouseEvent, node: PuppetSceneNode) => void
  readonly onToggleExpanded: (groupId: string) => void
  readonly selectedNodeIds: ReadonlySet<string>
}

const findSceneParentId = (document: PuppetDocument, nodeId: string): string | null => {
  const findParent = (
    nodes: ReadonlyArray<PuppetSceneNode>,
    parentId: string | null,
  ): string | null | undefined => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return parentId
      }

      if (node.kind === 'group') {
        const childParentId = findParent(node.children, node.id)
        if (childParentId !== undefined) {
          return childParentId
        }
      }
    }

    return undefined
  }

  return findParent(getDocumentScene(document).roots, null) ?? null
}

const getGroupIds = (nodes: ReadonlyArray<PuppetSceneNode>) => {
  const groupIds = new Set<string>()

  for (const node of nodes) {
    if (node.kind === 'group') {
      groupIds.add(node.id)
      for (const childId of getGroupIds(node.children)) {
        groupIds.add(childId)
      }
    }
  }

  return groupIds
}

const getNodeParameterLinks = (document: PuppetDocument, nodeId: string) => {
  const partIds = getSceneNodePartIds(document, nodeId)

  return getDocumentParameters(document).flatMap((parameter) => {
    const targetPartIds = new Set(getParameterTargetPartIds(parameter))
    const linkedPartCount = partIds.filter((partId) => targetPartIds.has(partId)).length

    if (linkedPartCount === 0) {
      return []
    }

    return [linkedPartCount === partIds.length ? parameter.name : `${parameter.name} 일부`]
  })
}

interface SceneNodeSelectProps {
  readonly document: PuppetDocument
  readonly locked: boolean
  readonly node: PuppetSceneNode
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onSelect: (event: MouseEvent, node: PuppetSceneNode) => void
  readonly parameterLinks: ReadonlyArray<string>
  readonly selected: boolean
}

const SceneNodeSelect = (props: SceneNodeSelectProps) => {
  const [isRenaming, setIsRenaming] = createSignal(false)
  const [nameDraft, setNameDraft] = createSignal('')
  const part = createMemo(() => props.document.parts.find((part) => part.id === props.node.id))
  let nameInput: HTMLInputElement | undefined

  const startRenaming = (event: MouseEvent) => {
    if (props.node.kind !== 'group' || props.locked) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setNameDraft(props.node.name)
    setIsRenaming(true)
    queueMicrotask(() => {
      nameInput?.focus()
      nameInput?.select()
    })
  }

  const finishRenaming = () => {
    if (!isRenaming() || props.node.kind !== 'group') {
      return
    }

    const document = renameSceneGroup(props.document, props.node.id, nameDraft())
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
    setIsRenaming(false)
  }

  return (
    <Show
      when={props.node.kind === 'group' && isRenaming()}
      fallback={
        <ToggleButton
          aria-label={`${props.node.name} 레이어 선택`}
          class="layer-select"
          pressed={props.selected}
          title={props.node.kind === 'group' ? '더블클릭하여 그룹 이름 수정' : undefined}
          onClick={(event) => props.onSelect(event, props.node)}
          onDblClick={startRenaming}
        >
          <Show
            when={props.node.kind === 'part'}
            fallback={
              <span class="layer-group-icon" aria-hidden="true">
                ▰
              </span>
            }
          >
            <span class="layer-thumbnail" aria-hidden="true">
              <img alt="" src={part()?.texture.src} />
            </span>
          </Show>
          <span class="layer-label">
            <strong>{props.node.name}</strong>
            <small>
              {props.node.kind === 'group'
                ? `${props.node.children.length} items`
                : `${(part()?.mesh.vertices.length ?? 0) / 2} vertices`}
            </small>
            <Show when={props.parameterLinks.length > 0}>
              <span class="layer-parameter-links">
                <For each={props.parameterLinks}>{(name) => <span>{name}</span>}</For>
              </span>
            </Show>
          </span>
        </ToggleButton>
      }
    >
      <TextField class="layer-inline-name-editor" value={nameDraft()} onChange={setNameDraft}>
        <span class="layer-group-icon" aria-hidden="true">
          ▰
        </span>
        <TextField.Input
          ref={(element) => {
            nameInput = element
          }}
          aria-label={`${props.node.name} 그룹 이름`}
          onBlur={finishRenaming}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              finishRenaming()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setIsRenaming(false)
            }
          }}
        />
      </TextField>
    </Show>
  )
}

const SceneNodeItem = (props: SceneNodeItemProps) => {
  const isExpanded = () => props.node.kind === 'group' && props.expandedGroupIds.has(props.node.id)
  const locked = () => props.inheritedLocked || props.node.locked
  const visible = () => props.inheritedVisible && props.node.visible
  const parameterLinks = createMemo(() => getNodeParameterLinks(props.document, props.node.id))

  return (
    <li
      aria-expanded={props.node.kind === 'group' ? isExpanded() : undefined}
      aria-level={props.depth}
      aria-selected={props.selectedNodeIds.has(props.node.id)}
      class="layer-tree-item"
      classList={{dragging: props.draggedNodeId === props.node.id}}
      draggable={!locked()}
      role="treeitem"
      onDragEnd={() => props.onDragStart('')}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={() => props.onDragStart(props.node.id)}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        props.onDrop(props.node)
      }}
    >
      <Collapsible
        class="layer-tree-node"
        open={isExpanded()}
        onOpenChange={() => {
          if (props.node.kind === 'group') {
            props.onToggleExpanded(props.node.id)
          }
        }}
      >
        <div class="layer-row" style={{'--layer-depth': props.depth - 1}}>
          <Show
            when={props.node.kind === 'group'}
            fallback={<span class="layer-tree-spacer" aria-hidden="true" />}
          >
            <Collapsible.Trigger
              aria-label={`${props.node.name} ${isExpanded() ? '접기' : '펼치기'}`}
              class="layer-tree-toggle"
            >
              {isExpanded() ? '▾' : '▸'}
            </Collapsible.Trigger>
          </Show>

          <SceneNodeSelect
            document={props.document}
            locked={locked()}
            node={props.node}
            parameterLinks={parameterLinks()}
            selected={props.selectedNodeIds.has(props.node.id)}
            onDocumentChange={props.onDocumentChange}
            onSelect={props.onSelect}
          />

          <div class="layer-state-actions">
            <ToggleButton
              aria-label={`${props.node.name} ${props.node.visible ? '숨기기' : '표시하기'}`}
              pressed={visible()}
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
              pressed={locked()}
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
        </div>

        <Show when={props.node.kind === 'group'}>
          <Collapsible.Content>
            <ul role="group">
              <For each={props.node.kind === 'group' ? props.node.children : []}>
                {(node) => (
                  <SceneNodeItem
                    depth={props.depth + 1}
                    document={props.document}
                    draggedNodeId={props.draggedNodeId}
                    expandedGroupIds={props.expandedGroupIds}
                    inheritedLocked={locked()}
                    inheritedVisible={visible()}
                    node={node}
                    onDocumentChange={props.onDocumentChange}
                    onDragStart={props.onDragStart}
                    onDrop={props.onDrop}
                    onSelect={props.onSelect}
                    onToggleExpanded={props.onToggleExpanded}
                    selectedNodeIds={props.selectedNodeIds}
                  />
                )}
              </For>
            </ul>
          </Collapsible.Content>
        </Show>
      </Collapsible>
    </li>
  )
}

interface LayerToolbarProps {
  readonly activeGroup?: PuppetSceneGroupNode
  readonly activeLocked: boolean
  readonly document: PuppetDocument
  readonly onDocumentChange: (document: PuppetDocument | undefined) => void
  readonly onSelectionChange?: (selection: SceneSelection) => void
  readonly selectionLocked: boolean
  readonly selection: SceneSelection
}

const LayerToolbar = (props: LayerToolbarProps) => (
  <div class="layer-toolbar" aria-label="레이어 계층 편집">
    <Button
      disabled={props.selectionLocked}
      type="button"
      onClick={() =>
        props.onDocumentChange(createSceneGroup(props.document, props.selection.nodeIds))
      }
    >
      그룹
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
      disabled={props.selection.activeNodeId === null || props.activeLocked}
      type="button"
      onClick={() => {
        const nodeId = props.selection.activeNodeId
        if (nodeId !== null) {
          props.onDocumentChange(moveSceneNodeToParent(props.document, nodeId))
        }
      }}
    >
      상위로
    </Button>
    <Button
      disabled={props.activeGroup === undefined || props.activeLocked}
      type="button"
      onClick={() => {
        const group = props.activeGroup
        if (group !== undefined) {
          props.onDocumentChange(ungroupSceneNode(props.document, group.id))
          props.onSelectionChange?.({activeNodeId: null, nodeIds: []})
        }
      }}
    >
      그룹 해제
    </Button>
  </div>
)

export const EditorLayerPanel = (props: EditorLayerPanelProps) => {
  const titleId = createUniqueId()
  const initialGroupIds = untrack(() => getGroupIds(getDocumentScene(props.document).roots))
  const [expandedGroupIds, setExpandedGroupIds] = createSignal<ReadonlySet<string>>(initialGroupIds)
  const [draggedNodeId, setDraggedNodeId] = createSignal<string | null>(null)
  const selection = createMemo<SceneSelection>(
    () =>
      props.selection ?? {
        activeNodeId: props.activePartId ?? null,
        nodeIds: props.activePartId === undefined ? [] : [props.activePartId],
      },
  )
  const selectedNodeIds = createMemo(() => new Set(selection().nodeIds))
  const activeNode = createMemo(() => {
    const {activeNodeId} = selection()
    return activeNodeId === null ? undefined : getSceneNode(props.document, activeNodeId)
  })
  const activeGroup = createMemo(() => {
    const node = activeNode()
    return node?.kind === 'group' ? node : undefined
  })
  const activeLocked = createMemo(() => {
    const {activeNodeId} = selection()
    return activeNodeId !== null && isSceneNodeLocked(props.document, activeNodeId)
  })
  const selectionLocked = createMemo(() =>
    selection().nodeIds.some((nodeId) => isSceneNodeLocked(props.document, nodeId)),
  )

  const handleSelect = (event: MouseEvent, node: PuppetSceneNode) => {
    const currentSelection = selection()
    const additive = event.metaKey || event.ctrlKey
    const nodeIds = additive
      ? currentSelection.nodeIds.includes(node.id)
        ? currentSelection.nodeIds.filter((nodeId) => nodeId !== node.id)
        : [...currentSelection.nodeIds, node.id]
      : [node.id]
    const nextSelection = {
      activeNodeId: nodeIds.includes(node.id) ? node.id : (nodeIds.at(-1) ?? null),
      nodeIds,
    }

    props.onSelectionChange?.(nextSelection)
    if (node.kind === 'part' && nextSelection.activeNodeId === node.id) {
      props.onPartSelect?.(node.id)
    }
  }

  const handleDocumentChange = (document: PuppetDocument | undefined) => {
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }

  const handleDrop = (target: PuppetSceneNode) => {
    const nodeId = draggedNodeId()

    if (nodeId === null || nodeId.length === 0) {
      return
    }

    handleDocumentChange(
      target.kind === 'group'
        ? moveSceneNode({document: props.document, nodeId, parentId: target.id})
        : moveSceneNode({
            beforeNodeId: target.id,
            document: props.document,
            nodeId,
            parentId: findSceneParentId(props.document, target.id),
          }),
    )
    setDraggedNodeId(null)
  }

  return (
    <aside class="panel layers-panel" aria-labelledby={titleId}>
      <div class="panel-heading">
        <h2 id={titleId}>Layers</h2>
        <span>{props.document.parts.length}</span>
      </div>
      <LayerToolbar
        activeGroup={activeGroup()}
        activeLocked={activeLocked()}
        document={props.document}
        selection={selection()}
        selectionLocked={selectionLocked()}
        onDocumentChange={handleDocumentChange}
        onSelectionChange={props.onSelectionChange}
      />
      <Show
        when={props.document.parts.length > 0}
        fallback={<p class="panel-note">PNG를 불러오세요.</p>}
      >
        <ul class="layer-tree" role="tree" aria-label="모델 레이어">
          <For each={getDocumentScene(props.document).roots}>
            {(node) => (
              <SceneNodeItem
                depth={1}
                document={props.document}
                draggedNodeId={draggedNodeId()}
                expandedGroupIds={expandedGroupIds()}
                inheritedLocked={false}
                inheritedVisible={true}
                node={node}
                onDocumentChange={props.onDocumentChange}
                onDragStart={(nodeId) => setDraggedNodeId(nodeId.length === 0 ? null : nodeId)}
                onDrop={handleDrop}
                onSelect={handleSelect}
                onToggleExpanded={(groupId) => {
                  const nextGroupIds = new Set(expandedGroupIds())
                  if (nextGroupIds.has(groupId)) {
                    nextGroupIds.delete(groupId)
                  } else {
                    nextGroupIds.add(groupId)
                  }
                  setExpandedGroupIds(nextGroupIds)
                }}
                selectedNodeIds={selectedNodeIds()}
              />
            )}
          </For>
        </ul>
      </Show>
      <p class="panel-note">⌘ 또는 Ctrl을 누르고 여러 레이어를 선택해 그룹으로 묶을 수 있습니다.</p>
    </aside>
  )
}
