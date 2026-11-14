import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  on,
  untrack,
} from 'solid-js'
import {type Player, type PuppetDocument} from '../../player'
import type {PuppetVertexReference} from '../../player/document'
import type {PuppetEditorProps} from '../types'
import type {EditorController} from '../control'
import type {PlayerCanvasStatus} from '../PlayerCanvas'
import {reconcileSceneSelection} from '../reconcile-scene-selection'
import {useEditorWorkspace} from '../use-editor-workspace'
import {useParameterEditor} from '../use-parameter-editor'
import {useAutoMesh} from '../use-auto-mesh'
import {useModelHistory} from '../use-model-history'
import {createEditorControl} from '../create-editor-control'
import {usePanelLayout} from '../use-panel-layout'
import {useDocumentHistoryShortcuts} from '../use-document-history-shortcuts'
import {type EditorSelectionIntent, useEditorSelection} from './use-editor-selection'
import {useTemporaryForm} from './use-temporary-form'
import {createSkinSession} from './skin-session'
import {useDeformerMode} from './use-deformer-mode'
import {createDeformerControlSelection} from './deformer-control-selection'
import {getParameterBindingsForNodeIds} from './parameter-keyforms'
import {setMaskTarget} from './mask-targets'
import {createParameterPreview, getParameterEditingDocument} from './parameter-sampling'
import {getParameterSelectionNodeIds} from './parameter-targets'
import {
  createSceneSelection,
  getSceneSelectionActions,
  getSelectedMeshPartIds,
  getSelectedPartId,
} from './selection-actions'
import {
  getSceneNode,
  getSceneSelectionPartIds,
  type SceneSelection,
  unwrapSceneNodes,
} from './scene-graph'
import {syncPlayerPlayback, togglePlayerPlayback} from './player-playback'

interface UseEditorStateProps extends Pick<
  PuppetEditorProps,
  'model' | 'active' | 'initialMotionId' | 'initialWorkspace'
> {
  /** Disposes this editor's body root after its control releases host-owned editing. */
  readonly onDispose: () => void
}

export interface UseEditorStateResult {
  readonly activeMotionId: Accessor<string | null>
  readonly activePartId: Accessor<string | null>
  readonly activeVertexIndex: Accessor<number | null>
  readonly activateHistoryShortcuts: () => void
  readonly autoMesh: ReturnType<typeof useAutoMesh>
  readonly control: EditorController
  readonly currentTime: Accessor<number>
  readonly deformerControlSelection: ReturnType<typeof createDeformerControlSelection>
  readonly deformerEditing: ReturnType<typeof useDeformerMode>
  readonly directlySelectedPartIds: Accessor<ReadonlyArray<string>>
  readonly dismissNotice: () => void
  readonly editMode: Accessor<'motion' | 'parameter'>
  readonly fitRevision: Accessor<number | undefined>
  readonly glueVertex: Accessor<PuppetVertexReference | null>
  readonly handleContainerUnwrap: () => void
  readonly handleDocumentEditStart: () => void
  readonly handleHistorySelect: (id: number) => boolean
  readonly handleInspectorDocumentChange: (document: PuppetDocument) => void
  readonly handleMaskPick: (partId: string) => void
  readonly handleMaskPickCancel: () => void
  readonly handleMaskPickStart: (partId: string) => void
  readonly handleMeshEditingStart: () => void
  readonly handleMotionChange: (motionId: string) => void
  readonly handleMotionSeek: (motionId: string, time: number) => void
  readonly handlePlaybackToggle: () => void
  readonly handlePlayerChange: (player: Player | null) => void
  readonly handleSeek: (time: number) => void
  readonly handleTimelineDocumentChange: (document: PuppetDocument) => void
  readonly handleViewportNotice: (message: string | null) => void
  readonly hasPlayer: Accessor<boolean>
  readonly history: ReturnType<typeof useModelHistory>
  readonly isPlaying: Accessor<boolean>
  readonly layerSelection: Accessor<SceneSelection>
  readonly layout: ReturnType<typeof usePanelLayout>
  readonly maskPickSourcePartId: Accessor<string | null>
  readonly meshPartIds: Accessor<ReadonlyArray<string>>
  readonly notice: Accessor<string | null>
  readonly parameterEditor: ReturnType<typeof useParameterEditor>
  readonly parameterPreviewDocument: Accessor<PuppetDocument>
  readonly pausePlayback: () => void
  readonly physicsPreview: Accessor<boolean>
  readonly requestLayerSelection: (selection: SceneSelection) => void
  readonly resetPhysics: () => void
  readonly selectedNodeIds: Accessor<ReadonlyArray<string>>
  readonly selectedPartIds: Accessor<ReadonlyArray<string>>
  readonly selectionActions: Accessor<ReturnType<typeof getSceneSelectionActions>>
  readonly selectionTransition: ReturnType<typeof useEditorSelection>
  readonly setActiveVertexIndex: (index: number | null) => void
  readonly setCurrentTime: (time: number) => void
  readonly setGlueVertex: (vertex: PuppetVertexReference | null) => void
  readonly setPhysicsPreview: (enabled: boolean) => void
  readonly setPlayerStatus: (status: PlayerCanvasStatus) => void
  readonly skinSession: ReturnType<typeof createSkinSession>
  readonly sourceDocument: Accessor<PuppetDocument>
  readonly temporary: ReturnType<typeof useTemporaryForm>
  readonly viewportTime: Accessor<number>
  readonly workspace: Accessor<'animation' | 'modeling'>
}

const WORKSPACE_EDIT_MODES = {animation: 'motion', modeling: 'parameter'} as const

/** Coordinates one editor's local view state and commands while borrowing host document/history. */
// eslint-disable-next-line complexity, max-lines-per-function, max-statements
export const useEditorState = (props: UseEditorStateProps): UseEditorStateResult => {
  const model = untrack(() => props.model)
  const initialDocument = untrack(() => model.read().document)
  const requestedMotionId = untrack(() => props.initialMotionId)
  const initialMotionId = initialDocument.motions.some((motion) => motion.id === requestedMotionId)
    ? (requestedMotionId ?? null)
    : (initialDocument.motions[0]?.id ?? null)
  const ownerId = createUniqueId()
  const history = useModelHistory(model, ownerId, () => control.getState().lifecycle === 'active')
  const layout = usePanelLayout()
  const sourceDocument = history.document
  const skinSession = createSkinSession()
  const [layerSelection, setLayerSelection] = createSignal(
    createSceneSelection(initialDocument.parts[0]?.id ?? null),
  )
  const activePartId = createMemo(() => getSelectedPartId(sourceDocument(), layerSelection()))
  const [glueVertex, setGlueVertex] = createSignal<PuppetVertexReference | null>(null)
  const [activeVertexIndex, setActiveVertexIndex] = createSignal<number | null>(null)
  const deformerEditing = useDeformerMode({
    document: sourceDocument,
    nodeId: () => layerSelection().activeNodeId ?? undefined,
    onDocumentChange: history.setDocument,
  })
  const deformerControlSelection = createDeformerControlSelection()
  const {workspace, setWorkspace} = useEditorWorkspace(
    untrack(() => props.initialWorkspace ?? 'modeling'),
  )
  const [playerStatus, setPlayerStatus] = createSignal<PlayerCanvasStatus>('loading')
  const [player, setPlayer] = createSignal<Player | null>(null)
  const [currentTime, setCurrentTime] = createSignal(0)
  const [playbackPreviewTime, setPlaybackPreviewTime] = createSignal(0)
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [physicsPreview, setPhysicsPreview] = createSignal(true)
  const [activeMotionId, setActiveMotionId] = createSignal<string | null>(initialMotionId)
  const [notice, setNotice] = createSignal<string | null>(null)
  const [maskPickSourcePartId, setMaskPickSourcePartId] = createSignal<string | null>(null)
  const selectedPartIds = createMemo(() =>
    getSceneSelectionPartIds(sourceDocument(), layerSelection()),
  )
  const directlySelectedPartIds = createMemo(() =>
    layerSelection().nodeIds.filter(
      (nodeId) => getSceneNode(sourceDocument(), nodeId)?.kind === 'part',
    ),
  )
  const meshPartIds = createMemo(() => getSelectedMeshPartIds(sourceDocument(), layerSelection()))
  const selectedNodeIds = createMemo(() =>
    getParameterSelectionNodeIds({document: sourceDocument(), selection: layerSelection()}),
  )
  const selectionActions = createMemo(() =>
    getSceneSelectionActions(sourceDocument(), layerSelection()),
  )
  const parameterEditor = useParameterEditor({
    document: sourceDocument,
    onBindingActivate: () => selectionTransition.reset(),
    onDocumentChange: history.setDocument,
    onNotice: setNotice,
    onSelectionRequest: (bindingId) => selectionTransition.selectBinding(bindingId),
    selectedBindingId: () => selectionTransition.bindingId(),
    selectedNodeIds,
  })
  const temporary = useTemporaryForm({
    bindingId: () => parameterEditor.activeBindingId() ?? undefined,
    document: parameterEditor.previewDocument,
    enabled: () =>
      workspace() === 'modeling' &&
      (activePartId() !== null ||
        getParameterBindingsForNodeIds(sourceDocument(), selectedNodeIds()).length > 0),
    keyformValues: parameterEditor.activeKeyformValues,
    nodeId: () => layerSelection().activeNodeId ?? undefined,
    onDocumentChange: history.setDocument,
    parameterValueMap: parameterEditor.parameterValueMap,
    parameterValues: parameterEditor.parameterValues,
  })
  const parameterEditingDocument = createMemo(() =>
    getParameterEditingDocument(
      temporary.document(),
      workspace() === 'modeling' ? temporary.bindingId() : undefined,
    ),
  )
  const parameterPreviewDocument = createMemo(() =>
    createParameterPreview({
      document: parameterEditingDocument(),
      parameterValues: temporary.valueMap(),
    }),
  )
  const selectionTransition = useEditorSelection({
    current: () => ({
      bindingId: parameterEditor.activeBindingId(),
      layers: layerSelection(),
      workspace: workspace(),
    }),
    document: sourceDocument,
    onCommit: (selection) => applySelection(selection),
  })
  const requestLayerSelection = (selection: SceneSelection) => {
    if (!skinSession.pick(sourceDocument(), selection.activeNodeId)) {
      selectionTransition.selectLayer(selection)
    }
  }
  const pausePlayback = () => {
    const currentPlayer = player()
    if (currentPlayer !== null && isPlaying()) {
      currentPlayer.pause()
      setIsPlaying(false)
    }
  }
  const applySelection = (selection: EditorSelectionIntent) => {
    if (selection.layers !== layerSelection()) {
      temporary.hide()
      setMaskPickSourcePartId(null)
      setLayerSelection(selection.layers)
      setActiveVertexIndex(null)
      deformerControlSelection.clear()
    }
    if (selection.workspace !== workspace()) {
      pausePlayback()
      temporary.hide()
      setWorkspace(selection.workspace)
    }
    if (selection.bindingId !== null) {
      parameterEditor.selectBinding(selection.bindingId)
    }
  }

  createEffect(() => {
    const {motions} = sourceDocument()
    const selectedMotionId = activeMotionId()

    if (selectedMotionId !== null && motions.some((motion) => motion.id === selectedMotionId)) {
      return
    }

    setActiveMotionId(motions[0]?.id ?? null)
  })
  const handleDocumentEditStart = () => {
    pausePlayback()
    history.beginTransaction()
  }
  const handleHistoryChange = (changed: boolean) => {
    if (changed) {
      pausePlayback()
    }
    return changed
  }
  const handleUndo = () => handleHistoryChange(history.undo())
  const handleRedo = () => handleHistoryChange(history.redo())
  const handleHistorySelect = (id: number) => handleHistoryChange(history.goTo(id))
  const activateHistoryShortcuts = useDocumentHistoryShortcuts({
    active: () => control.getState().lifecycle === 'active',
    onRedo: handleRedo,
    onUndo: handleUndo,
  })
  const autoMesh = useAutoMesh({
    document: sourceDocument,
    onBeforeApply: pausePlayback,
    onDocumentChange(document) {
      const result = history.setDocument(document, '자동 메시 생성')
      if (result.ok) {
        setActiveVertexIndex(null)
      }
      return result
    },
    onNotice: setNotice,
    partIds: () => selectionActions().autoMeshPartIds,
    revision: model.revision,
  })

  const handlePlayerChange = (nextPlayer: Player | null) => {
    setPlayer(syncPlayerPlayback(nextPlayer, isPlaying()))
  }

  const handlePlaybackToggle = () => {
    const currentPlayer = player()

    if (currentPlayer !== null) {
      if (!isPlaying()) {
        setPlaybackPreviewTime(currentTime())
      }
      setIsPlaying(togglePlayerPlayback(currentPlayer, isPlaying()))
    }
  }

  const handleMotionChange = (motionId: string) => {
    if (!sourceDocument().motions.some((motion) => motion.id === motionId)) {
      return
    }

    pausePlayback()
    setActiveMotionId(motionId)
    setCurrentTime(0)
    player()?.setMotion(motionId)
  }

  const handleMotionSeek = (motionId: string, time: number) => {
    const currentPlayer = player()

    if (
      currentPlayer === null ||
      !sourceDocument().motions.some((motion) => motion.id === motionId)
    ) {
      return
    }

    pausePlayback()
    batch(() => {
      setActiveMotionId(motionId)
      setCurrentTime(time)
    })
    currentPlayer.setMotion(motionId)
    currentPlayer.seek(time)
  }

  const handleTimelineDocumentChange = (document: PuppetDocument) => {
    pausePlayback()
    history.setDocument(document)
  }
  const handleContainerUnwrap = () => {
    const document = unwrapSceneNodes(sourceDocument(), selectionActions().containerIds)
    if (document !== undefined) {
      batch(() => {
        history.setDocument(document)
        setLayerSelection({activeNodeId: null, nodeIds: []})
        setActiveVertexIndex(null)
        selectionTransition.reset()
      })
    }
  }
  const handleMaskPick = (targetPartId: string) => {
    const maskPartId = maskPickSourcePartId()
    if (maskPartId === null) {
      return
    }
    const document = setMaskTarget({
      checked: true,
      document: sourceDocument(),
      maskPartId,
      targetPartId,
    })
    if (document === undefined) {
      setNotice('잠금 또는 순환 참조 때문에 이 레이어에 마스크를 적용할 수 없습니다.')
      return
    }
    history.setDocument(document)
    setMaskPickSourcePartId(null)
    setNotice(null)
  }

  const control = createEditorControl({
    initiallyActive: untrack(() => props.active !== false),
    model,
    onDispose: () => props.onDispose(),
    ownerId,
    read: () => ({
      appliedMode: workspace(),
      hasTemporaryChanges: temporary.hasChanges(),
      mode: selectionTransition.workspace(),
      modePending: selectionTransition.pending(),
      panels: {bottom: layout.bottomOpen(), left: layout.leftOpen(), right: layout.rightOpen()},
      renderer: playerStatus(),
    }),
    resetSelection: selectionTransition.reset,
    selectMode: selectionTransition.selectWorkspace,
    setPanelOpen: layout.setOpen,
    stop: () => {
      pausePlayback()
      autoMesh.onOpenChange(false)
    },
  })
  createEffect(() => {
    const inactive = props.active === false
    const blocked = inactive && model.read().transaction !== null
    if (!blocked) {
      untrack(() => (inactive ? control.lifecycle.deactivate() : control.lifecycle.activate()))
    }
  })
  createEffect(
    on(
      model.revision,
      () => {
        const current = model.read()
        const {change} = current
        if (change === null) {
          return
        }
        untrack(() => {
          if (change.kind === 'reset' || change.historyKind === 'replace') {
            pausePlayback()
            temporary.reset()
            setLayerSelection(createSceneSelection(current.document.parts[0]?.id ?? null))
            setActiveVertexIndex(null)
            setMaskPickSourcePartId(null)
            deformerControlSelection.clear()
            parameterEditor.reset(current.document)
            setCurrentTime(0)
            selectionTransition.reset()
          } else {
            setLayerSelection((selection) => reconcileSceneSelection(current.document, selection))
            if (change.phase === 'rollback') {
              selectionTransition.reset()
            }
          }
        })
      },
      {defer: true},
    ),
  )
  const handleInspectorDocumentChange = (document: PuppetDocument) => {
    if (temporary.target() === undefined) {
      deformerEditing.updateInspector(document)
    } else {
      temporary.update(document)
    }
  }
  const handleMaskPickStart = (partId: string) => {
    setMaskPickSourcePartId(partId)
    setNotice('마스크를 적용할 대상 레이어를 왼쪽 패널에서 선택하세요.')
  }
  const handleMaskPickCancel = () => setMaskPickSourcePartId(null)
  const handleMeshEditingStart = () => {
    pausePlayback()
    temporary.hide()
  }
  const handleViewportNotice = (message: string | null) =>
    setNotice(temporary.target() === undefined ? message : null)
  const handleSeek = (time: number) => player()?.seek(time)
  const resetPhysics = () => player()?.resetPhysics()
  const dismissNotice = () => setNotice(null)
  const hasPlayer = () => player() !== null
  const editMode = () => WORKSPACE_EDIT_MODES[workspace()]
  const viewportTime = () => (isPlaying() ? playbackPreviewTime() : currentTime())
  const fitRevision = () => {
    const current = model.read()
    return current.change?.historyKind === 'replace' || current.change?.kind === 'reset'
      ? current.revision
      : undefined
  }
  return {
    activateHistoryShortcuts,
    activeMotionId,
    activePartId,
    activeVertexIndex,
    autoMesh,
    control,
    currentTime,
    deformerControlSelection,
    deformerEditing,
    directlySelectedPartIds,
    dismissNotice,
    editMode,
    fitRevision,
    glueVertex,
    handleContainerUnwrap,
    handleDocumentEditStart,
    handleHistorySelect,
    handleInspectorDocumentChange,
    handleMaskPick,
    handleMaskPickCancel,
    handleMaskPickStart,
    handleMeshEditingStart,
    handleMotionChange,
    handleMotionSeek,
    handlePlaybackToggle,
    handlePlayerChange,
    handleSeek,
    handleTimelineDocumentChange,
    handleViewportNotice,
    hasPlayer,
    history,
    isPlaying,
    layerSelection,
    layout,
    maskPickSourcePartId,
    meshPartIds,
    notice,
    parameterEditor,
    parameterPreviewDocument,
    pausePlayback,
    physicsPreview,
    requestLayerSelection,
    resetPhysics,
    selectedNodeIds,
    selectedPartIds,
    selectionActions,
    selectionTransition,
    setActiveVertexIndex,
    setCurrentTime,
    setGlueVertex,
    setPhysicsPreview,
    setPlayerStatus,
    skinSession,
    sourceDocument,
    temporary,
    viewportTime,
    workspace,
  }
}
