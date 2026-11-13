import {useLayerClipboard} from './use-layer-clipboard'
import {EditorContextMenu} from './EditorContextMenu'
import {getContainerIds} from './scene-tree'
import {KeyedFor} from './KeyedFor'
import {EditorButton, EditorTextInput} from '../../design-system'
import {TextField} from '@kobalte/core/text-field'
import {createEffect, createMemo, createSignal, on, Show, untrack} from 'solid-js'
import {getFilteredLayerIds} from './get-filtered-layer-ids'
import {xor} from 'es-toolkit/array'
import {getDocumentScene, type PuppetDocument, type PuppetSceneNode} from '../../player'
import {
  createSceneGroup,
  isSceneNodeLocked,
  moveSceneNodeRelative,
  type SceneSelection,
} from './scene-graph'
import {EditorLayerToolbar} from './EditorLayerToolbar'
import type {LayerDropTarget} from './layer-drop'
import {EditorSceneNodeItem} from './EditorSceneNodeItem'

export interface EditorLayerPanelProps {
  readonly activePartId?: string
  readonly document: PuppetDocument
  readonly maskPickSourcePartId?: string
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onMaskPick?: (partId: string) => void
  readonly onPartSelect?: (partId: string) => void
  readonly onSelectionChange?: (selection: SceneSelection) => void
  readonly selection?: SceneSelection
}

const createGroup = (document: PuppetDocument, nodeIds: ReadonlyArray<string>) => {
  const previousIds = getContainerIds(getDocumentScene(document).roots)
  const nextDocument = createSceneGroup(document, nodeIds)
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

// eslint-disable-next-line max-lines-per-function
export const EditorLayerPanel = (props: EditorLayerPanelProps) => {
  const [filter, setFilter] = createSignal('')
  const filtering = createMemo(() => filter().trim().length > 0)
  const roots = createMemo(() => getDocumentScene(props.document).roots)
  const visibleNodeIds = createMemo(() =>
    filtering() ? getFilteredLayerIds(roots(), filter()) : undefined,
  )
  const [filteredCollapsedIds, setFilteredCollapsedIds] = createSignal<ReadonlySet<string>>(
    new Set(),
  )
  const filteredExpandedIds = createMemo(
    () => new Set([...getContainerIds(roots())].filter((id) => !filteredCollapsedIds().has(id))),
  )
  createEffect(on(filter, () => setFilteredCollapsedIds(new Set<string>())))
  const initialGroupIds = untrack(() => getContainerIds(getDocumentScene(props.document).roots))
  const [expandedGroupIds, setExpandedGroupIds] = createSignal<ReadonlySet<string>>(initialGroupIds)
  const [draggedNodeId, setDraggedNodeId] = createSignal<string | null>(null)
  const [dropTarget, setDropTarget] = createSignal<LayerDropTarget | null>(null)
  let filterInput: HTMLInputElement | undefined
  const handleFilterClear = () => {
    setFilter('')
    filterInput?.focus()
  }
  const handleFilterKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.isComposing) {
      event.stopPropagation()
      handleFilterClear()
    }
  }
  const handleToggleExpanded = (groupId: string) => {
    const setIds = filtering() ? setFilteredCollapsedIds : setExpandedGroupIds
    setIds((ids) => new Set(xor([...ids], [groupId])))
  }
  const selection = createMemo<SceneSelection>(
    () =>
      props.selection ?? {
        activeNodeId: props.activePartId ?? null,
        nodeIds: props.activePartId === undefined ? [] : [props.activePartId],
      },
  )
  const clipboard = useLayerClipboard({
    document: () => props.document,
    onDocumentChange: (document) => props.onDocumentChange?.(document),
    onSelectionChange: (selection) => props.onSelectionChange?.(selection),
    selection,
  })
  const selectedNodeIds = createMemo(() => new Set(selection().nodeIds))
  const activeLocked = createMemo(() => {
    const {activeNodeId} = selection()
    return activeNodeId !== null && isSceneNodeLocked(props.document, activeNodeId)
  })
  const selectionLocked = createMemo(() =>
    selection().nodeIds.some((nodeId) => isSceneNodeLocked(props.document, nodeId)),
  )

  const handleSelect = (event: MouseEvent, node: PuppetSceneNode) => {
    if (props.maskPickSourcePartId !== undefined && node.kind === 'part') {
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
      position:
        target.nodeId === null
          ? 'before'
          : target.position === 'inside'
            ? 'inside'
            : target.position === 'before'
              ? 'after'
              : 'before',
      targetNodeId:
        target.nodeId ??
        getDocumentScene(props.document).roots.find((node) => node.id !== nodeId)?.id ??
        null,
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
      classList={{'mask-picking': props.maskPickSourcePartId !== undefined}}
      aria-label="Layers"
      onClick={(event) => {
        if (
          event.target instanceof Element &&
          event.target.matches(
            '.layers-panel, .layer-scroll, .layer-tree, .layer-toolbar, .layer-statistics, ul[role="group"]',
          )
        ) {
          props.onSelectionChange?.({activeNodeId: null, nodeIds: []})
        }
      }}
    >
      <EditorLayerToolbar
        activeLocked={activeLocked()}
        document={props.document}
        selection={selection()}
        selectionLocked={selectionLocked()}
        onDocumentChange={handleDocumentChange}
        onGroupCreate={() => handleGroupCreate()}
      />
      <div class="layer-filter">
        <TextField class="layer-filter-input" value={filter()} onChange={setFilter}>
          <EditorTextInput
            ref={(element) => {
              filterInput = element
            }}
            aria-label="레이어 이름 필터"
            placeholder="이름으로 필터"
            onKeyDown={handleFilterKeyDown}
          />
        </TextField>
        <Show when={filter().length > 0}>
          <EditorButton
            aria-label="레이어 필터 지우기"
            title="필터 지우기"
            onClick={handleFilterClear}
          >
            <span aria-hidden="true" class="puppet-icon puppet-icon-filter-clear" />
          </EditorButton>
        </Show>
      </div>
      <Show when={visibleNodeIds()?.size === 0}>
        <p class="panel-note" role="status">
          일치하는 레이어가 없습니다.
        </p>
      </Show>
      <Show when={props.maskPickSourcePartId !== undefined}>
        <p class="mask-pick-notice" role="status">
          마스크를 적용할 대상 레이어를 선택하세요.
        </p>
      </Show>
      <EditorContextMenu
        label="레이어 목록 작업"
        triggerClass="puppet-layer-list-menu"
        disabled={props.maskPickSourcePartId !== undefined}
        entries={
          clipboard.canPaste()
            ? [
                {
                  disabled: props.onDocumentChange === undefined,
                  id: 'paste',
                  label: '붙여넣기',
                  onSelect: () => clipboard.paste(null),
                  type: 'action',
                },
              ]
            : []
        }
      >
        <div class="layer-scroll" tabindex={0} aria-label="레이어 목록 스크롤">
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
              <KeyedFor
                each={getDocumentScene(props.document).roots.toReversed()}
                key={(node) => node.id}
              >
                {(node) => (
                  <EditorSceneNodeItem
                    clipboard={clipboard}
                    depth={1}
                    visibleNodeIds={visibleNodeIds()}
                    document={props.document}
                    draggedNodeId={draggedNodeId()}
                    dropTarget={dropTarget()}
                    expandedGroupIds={filtering() ? filteredExpandedIds() : expandedGroupIds()}
                    inheritedLocked={false}
                    inheritedVisible={true}
                    maskPickSourcePartId={props.maskPickSourcePartId}
                    node={node()}
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
                    onToggleExpanded={handleToggleExpanded}
                    selectedNodeIds={selectedNodeIds()}
                  />
                )}
              </KeyedFor>
            </ul>
          </Show>
        </div>
      </EditorContextMenu>
      <footer class="layer-statistics" aria-label="전체 정점 수">
        {props.document.parts.reduce((total, part) => total + part.mesh.vertices.length / 2, 0)}{' '}
        vertices
      </footer>
    </aside>
  )
}
