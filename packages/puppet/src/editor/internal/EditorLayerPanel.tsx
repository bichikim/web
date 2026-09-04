import {Collapsible} from '@kobalte/core/collapsible'
import {TextField} from '@kobalte/core/text-field'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {createMemo, createSignal, createUniqueId, For, Show, untrack} from 'solid-js'

import {
  getDocumentScene,
  isSceneContainerNode,
  type PuppetDocument,
  type PuppetSceneNode,
} from '../../player'
import {
  createDeformer,
  createSceneGroup,
  isSceneNodeLocked,
  moveSceneNodeRelative,
  renameSceneNode,
  type SceneSelection,
} from './scene-graph'
import {EditorLayerToolbar} from './EditorLayerToolbar'
import {EditorLayerStateActions} from './EditorLayerStateActions'
import {EditorLayerMaskUsage} from './EditorLayerMaskUsage'
import {EditorLayerTreeToggle} from './EditorLayerTreeToggle'
import {getLayerDropPosition, type LayerDropTarget} from './layer-drop'
import {getLayerMaskUsageCount, isLayerMaskPickDisabled} from './layer-mask'
import {
  getBindingParameters,
  getDocumentParameterBindings,
  getParameterTargetNodeIds,
} from './parameter-keyforms'
import {getParameterSelectionNodeIds} from './parameter-targets'

export interface EditorLayerPanelProps {
  readonly activePartId?: string
  readonly document: PuppetDocument
  readonly maskPickTargetPartId?: string
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onMaskPick?: (partId: string) => void
  readonly onPartSelect?: (partId: string) => void
  readonly onSelectionChange?: (selection: SceneSelection) => void
  readonly selection?: SceneSelection
}

interface SceneNodeItemProps {
  readonly depth: number
  readonly document: PuppetDocument
  readonly draggedNodeId: string | null
  readonly dropTarget: LayerDropTarget | null
  readonly expandedGroupIds: ReadonlySet<string>
  readonly inheritedLocked: boolean
  readonly inheritedVisible: boolean
  readonly maskPickTargetPartId?: string
  readonly node: PuppetSceneNode
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onDragOver: (target: LayerDropTarget) => void
  readonly onDragStart: (nodeId: string) => void
  readonly onDrop: (target: LayerDropTarget) => void
  readonly onSelect: (event: MouseEvent, node: PuppetSceneNode) => void
  readonly onToggleExpanded: (groupId: string) => void
  readonly selectedNodeIds: ReadonlySet<string>
}

const getContainerIds = (nodes: ReadonlyArray<PuppetSceneNode>) => {
  const groupIds = new Set<string>()

  for (const node of nodes) {
    if (isSceneContainerNode(node)) {
      groupIds.add(node.id)
      for (const childId of getContainerIds(node.children)) {
        groupIds.add(childId)
      }
    }
  }

  return groupIds
}

const createGroup = (document: PuppetDocument, nodeIds: ReadonlyArray<string>) => {
  const previousIds = getContainerIds(getDocumentScene(document).roots)
  const nextDocument = createDeformer(document, nodeIds) ?? createSceneGroup(document, nodeIds)
  return nextDocument === undefined
    ? undefined
    : {
        document: nextDocument,
        nodeId: [...getContainerIds(getDocumentScene(nextDocument).roots)].find(
          (candidate) => !previousIds.has(candidate),
        ),
      }
}

const getNextSelection = (
  current: SceneSelection,
  event: MouseEvent,
  node: PuppetSceneNode,
): SceneSelection => {
  const additive = event.metaKey || event.ctrlKey
  const nodeIds = additive
    ? current.nodeIds.includes(node.id)
      ? current.nodeIds.filter((nodeId) => nodeId !== node.id)
      : [...current.nodeIds, node.id]
    : [node.id]
  return {activeNodeId: nodeIds.includes(node.id) ? node.id : (nodeIds.at(-1) ?? null), nodeIds}
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

interface SceneNodeSelectProps {
  readonly document: PuppetDocument
  readonly locked: boolean
  readonly maskPickDisabled: boolean
  readonly maskPicking: boolean
  readonly maskUsageCount: number
  readonly node: PuppetSceneNode
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onSelect: (event: MouseEvent, node: PuppetSceneNode) => void
  readonly parameterLinks: ReadonlyArray<string>
  readonly selected: boolean
}

interface LayerContainerIconProps {
  readonly kind: 'deformer' | 'group'
}

const LayerContainerIcon = (props: LayerContainerIconProps) => (
  <Show
    when={props.kind === 'deformer'}
    fallback={
      <svg
        aria-hidden="true"
        class="layer-container-icon group"
        data-layer-icon="group"
        viewBox="0 0 24 24"
      >
        <rect height="11" rx="2" width="12" x="3" y="4" />
        <rect height="11" rx="2" width="12" x="9" y="9" />
      </svg>
    }
  >
    <svg
      aria-hidden="true"
      class="layer-container-icon deformer"
      data-layer-icon="deformer"
      viewBox="0 0 24 24"
    >
      <path d="M4 4 20 3 19 20 3 19Z" />
      <path d="m12 3.5-.5 16M3.5 11.5l16-.5" />
      <circle cx="4" cy="4" r="1.25" />
      <circle cx="20" cy="3" r="1.25" />
      <circle cx="19" cy="20" r="1.25" />
      <circle cx="3" cy="19" r="1.25" />
    </svg>
  </Show>
)

const SceneNodeSelect = (props: SceneNodeSelectProps) => {
  const [isRenaming, setIsRenaming] = createSignal(false)
  const [nameDraft, setNameDraft] = createSignal('')
  const part = createMemo(() => props.document.parts.find((part) => part.id === props.node.id))
  let nameInput: HTMLInputElement | undefined

  const startRenaming = (event: MouseEvent) => {
    if (!isSceneContainerNode(props.node) || props.locked) {
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
    if (!isRenaming() || !isSceneContainerNode(props.node)) {
      return
    }

    const document = renameSceneNode(props.document, props.node.id, nameDraft())
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
    setIsRenaming(false)
  }

  return (
    <Show
      when={isSceneContainerNode(props.node) && isRenaming()}
      fallback={
        <ToggleButton
          aria-label={`${props.node.name} 레이어 선택`}
          class="layer-select"
          classList={{'mask-pick-candidate': props.maskPicking && !props.maskPickDisabled}}
          disabled={props.maskPickDisabled}
          pressed={props.selected}
          title={
            props.maskPickDisabled
              ? '이 레이어는 현재 파츠의 마스크로 사용할 수 없습니다.'
              : isSceneContainerNode(props.node)
                ? '더블클릭하여 이름 수정'
                : undefined
          }
          onClick={(event) => props.onSelect(event, props.node)}
          onDblClick={startRenaming}
        >
          <Show
            when={props.node.kind === 'part'}
            fallback={
              <LayerContainerIcon kind={props.node.kind === 'deformer' ? 'deformer' : 'group'} />
            }
          >
            <span class="layer-thumbnail" aria-hidden="true">
              <img alt="" src={part()?.texture.src} />
            </span>
          </Show>
          <span class="layer-label">
            <strong>{props.node.name}</strong>
            <small>
              {isSceneContainerNode(props.node)
                ? `${props.node.children.length} items`
                : `${(part()?.mesh.vertices.length ?? 0) / 2} vertices`}
            </small>
            <Show when={props.parameterLinks.length > 0}>
              <span class="layer-parameter-links">
                <For each={props.parameterLinks}>{(name) => <span>{name}</span>}</For>
              </span>
            </Show>
          </span>
          <EditorLayerMaskUsage count={props.maskUsageCount} />
        </ToggleButton>
      }
    >
      <TextField class="layer-inline-name-editor" value={nameDraft()} onChange={setNameDraft}>
        <LayerContainerIcon kind={props.node.kind === 'deformer' ? 'deformer' : 'group'} />
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
  const isExpanded = () =>
    isSceneContainerNode(props.node) && props.expandedGroupIds.has(props.node.id)
  const locked = () => props.inheritedLocked || props.node.locked
  const visible = () => props.inheritedVisible && props.node.visible
  const parameterLinks = createMemo(() => getNodeParameterLinks(props.document, props.node.id))
  const maskPickDisabled = () =>
    isLayerMaskPickDisabled({
      document: props.document,
      node: props.node,
      targetPartId: props.maskPickTargetPartId,
    })
  const maskUsageCount = () => getLayerMaskUsageCount(props.document, props.node.id)
  const dropPosition = () =>
    props.dropTarget?.nodeId === props.node.id ? props.dropTarget.position : null

  return (
    <li
      aria-expanded={isSceneContainerNode(props.node) ? isExpanded() : undefined}
      aria-level={props.depth}
      aria-selected={props.selectedNodeIds.has(props.node.id)}
      class="layer-tree-item"
      classList={{dragging: props.draggedNodeId === props.node.id}}
      draggable={!locked() && props.maskPickTargetPartId === undefined}
      role="treeitem"
      onDragEnd={() => props.onDragStart('')}
      onDragStart={(event) => {
        event.stopPropagation()
        event.dataTransfer?.setData('text/plain', props.node.id)
        if (event.dataTransfer !== null && event.dataTransfer !== undefined) {
          event.dataTransfer.effectAllowed = 'move'
        }
        props.onDragStart(props.node.id)
      }}
    >
      <Collapsible
        class="layer-tree-node"
        open={isExpanded()}
        onOpenChange={() => {
          if (isSceneContainerNode(props.node)) {
            props.onToggleExpanded(props.node.id)
          }
        }}
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
            if (event.dataTransfer !== null && event.dataTransfer !== undefined) {
              event.dataTransfer.dropEffect = 'move'
            }
            props.onDragOver({
              nodeId: props.node.id,
              position: getLayerDropPosition(
                props.node,
                event.currentTarget.getBoundingClientRect(),
                event.clientY,
              ),
            })
          }}
          onDrop={(event) => {
            if (props.draggedNodeId === null) {
              return
            }

            event.preventDefault()
            event.stopPropagation()
            props.onDrop({
              nodeId: props.node.id,
              position: getLayerDropPosition(
                props.node,
                event.currentTarget.getBoundingClientRect(),
                event.clientY,
              ),
            })
          }}
        >
          <Show
            when={isSceneContainerNode(props.node)}
            fallback={<span class="layer-tree-spacer" aria-hidden="true" />}
          >
            <EditorLayerTreeToggle expanded={isExpanded()} name={props.node.name} />
          </Show>

          <SceneNodeSelect
            document={props.document}
            locked={locked()}
            maskPickDisabled={maskPickDisabled()}
            maskPicking={props.maskPickTargetPartId !== undefined}
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

        <Show when={isSceneContainerNode(props.node)}>
          <Collapsible.Content>
            <ul role="group">
              <For each={isSceneContainerNode(props.node) ? props.node.children : []}>
                {(node) => (
                  <SceneNodeItem
                    depth={props.depth + 1}
                    document={props.document}
                    draggedNodeId={props.draggedNodeId}
                    dropTarget={props.dropTarget}
                    expandedGroupIds={props.expandedGroupIds}
                    inheritedLocked={locked()}
                    inheritedVisible={visible()}
                    maskPickTargetPartId={props.maskPickTargetPartId}
                    node={node}
                    onDocumentChange={props.onDocumentChange}
                    onDragOver={props.onDragOver}
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

// eslint-disable-next-line max-lines-per-function
export const EditorLayerPanel = (props: EditorLayerPanelProps) => {
  const titleId = createUniqueId()
  const initialGroupIds = untrack(() => getContainerIds(getDocumentScene(props.document).roots))
  const [expandedGroupIds, setExpandedGroupIds] = createSignal<ReadonlySet<string>>(initialGroupIds)
  const [draggedNodeId, setDraggedNodeId] = createSignal<string | null>(null)
  const [dropTarget, setDropTarget] = createSignal<LayerDropTarget | null>(null)
  const selection = createMemo<SceneSelection>(
    () =>
      props.selection ?? {
        activeNodeId: props.activePartId ?? null,
        nodeIds: props.activePartId === undefined ? [] : [props.activePartId],
      },
  )
  const selectedNodeIds = createMemo(() => new Set(selection().nodeIds))
  const activeLocked = createMemo(() => {
    const {activeNodeId} = selection()
    return activeNodeId !== null && isSceneNodeLocked(props.document, activeNodeId)
  })
  const selectionLocked = createMemo(() =>
    selection().nodeIds.some((nodeId) => isSceneNodeLocked(props.document, nodeId)),
  )

  const handleSelect = (event: MouseEvent, node: PuppetSceneNode) => {
    if (props.maskPickTargetPartId !== undefined && node.kind === 'part') {
      props.onMaskPick?.(node.id)
      return
    }

    const nextSelection = getNextSelection(selection(), event, node)

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

  const handleGroupCreate = () => {
    const result = createGroup(props.document, selection().nodeIds)
    if (result === undefined) {
      return
    }
    props.onDocumentChange?.(result.document)
    if (result.nodeId !== undefined) {
      setExpandedGroupIds(new Set([...expandedGroupIds(), result.nodeId]))
      props.onSelectionChange?.({activeNodeId: result.nodeId, nodeIds: [result.nodeId]})
    }
  }

  const handleDrop = (target: LayerDropTarget) => {
    const nodeId = draggedNodeId()

    if (nodeId === null || nodeId.length === 0) {
      return
    }

    const document = moveSceneNodeRelative({
      document: props.document,
      nodeId,
      position: target.position,
      targetNodeId: target.nodeId,
    })

    handleDocumentChange(document)
    if (document !== undefined && target.nodeId !== null && target.position === 'inside') {
      setExpandedGroupIds(new Set([...expandedGroupIds(), target.nodeId]))
    }
    setDraggedNodeId(null)
    setDropTarget(null)
  }

  return (
    <aside
      class="panel layers-panel"
      classList={{'mask-picking': props.maskPickTargetPartId !== undefined}}
      aria-labelledby={titleId}
    >
      <div class="panel-heading">
        <h2 id={titleId}>Layers</h2>
        <span>{props.document.parts.length}</span>
      </div>
      <EditorLayerToolbar
        activeLocked={activeLocked()}
        document={props.document}
        selection={selection()}
        selectionLocked={selectionLocked()}
        onDocumentChange={handleDocumentChange}
        onGroupCreate={handleGroupCreate}
      />
      <Show when={props.maskPickTargetPartId !== undefined}>
        <p class="mask-pick-notice" role="status">
          마스크로 사용할 레이어를 선택하세요.
        </p>
      </Show>
      <Show
        when={props.document.parts.length > 0}
        fallback={<p class="panel-note">PNG를 불러오세요.</p>}
      >
        <ul
          class="layer-tree"
          classList={{'root-drop-active': dropTarget()?.nodeId === null}}
          role="tree"
          aria-label="모델 레이어"
          onDragOver={(event) => {
            if (draggedNodeId() === null) {
              return
            }

            event.preventDefault()
            if (event.target === event.currentTarget) {
              setDropTarget({nodeId: null, position: 'inside'})
            }
          }}
          onDrop={(event) => {
            if (draggedNodeId() !== null && event.target === event.currentTarget) {
              event.preventDefault()
              handleDrop({nodeId: null, position: 'inside'})
            }
          }}
        >
          <For each={getDocumentScene(props.document).roots}>
            {(node) => (
              <SceneNodeItem
                depth={1}
                document={props.document}
                draggedNodeId={draggedNodeId()}
                dropTarget={dropTarget()}
                expandedGroupIds={expandedGroupIds()}
                inheritedLocked={false}
                inheritedVisible={true}
                maskPickTargetPartId={props.maskPickTargetPartId}
                node={node}
                onDocumentChange={props.onDocumentChange}
                onDragOver={setDropTarget}
                onDragStart={(nodeId) => {
                  setDraggedNodeId(nodeId.length === 0 ? null : nodeId)
                  if (nodeId.length === 0) {
                    setDropTarget(null)
                  }
                }}
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
