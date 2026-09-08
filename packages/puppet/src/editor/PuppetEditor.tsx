import {useEditorImports} from './use-editor-imports'
import {EditorModelingKeyformPanel} from './internal/EditorModelingKeyformPanel'
import {useTemporaryForm} from './internal/use-temporary-form'
import {TemporaryFormButton} from './internal/TemporaryFormButton'
import {createSkinSession, SkinSessionContext} from './internal/skin-session'
import {SkinningEditor} from './internal/SkinningEditor'
import type {PuppetVertexReference} from '../player/document'
import {GlueEditor} from './internal/GlueEditor'
import {useDeformerMode} from './internal/use-deformer-mode'
import {Portal} from 'solid-js/web'
import {batch, createEffect, createMemo, createSignal, Show, untrack} from 'solid-js'
import {createDemoDocument, type Player, type PuppetDocument, serializeDocument} from '../player'
import {EditorViewport} from './EditorViewport'
import {createDeformerControlSelection} from './internal/deformer-control-selection'
import {EditorAutoMeshDialog} from './internal/EditorAutoMeshDialog'
import {EditorInspector} from './internal/EditorInspector'
import {EditorLayerPanel} from './internal/EditorLayerPanel'
import {getParameterBindingsForNodeIds} from './internal/parameter-keyforms'
import {setMaskTarget} from './internal/mask-targets'
import {createParameterPreview} from './internal/parameter-sampling'
import {getParameterSelectionNodeIds} from './internal/parameter-targets'
import {
  createSceneSelection,
  getSceneSelectionActions,
  getSelectedPartId,
} from './internal/selection-actions'
import {
  getSceneSelectionPartIds,
  type SceneSelection,
  unwrapSceneNodes,
} from './internal/scene-graph'
import {EditorPanelLayout} from './internal/EditorPanelLayout'
import {EditorTimeline} from './internal/EditorTimeline'
import {EditorToolbar} from './internal/EditorToolbar'
import {type ParameterEditorResult, useParameterEditor} from './use-parameter-editor'
import {useAutoMesh} from './use-auto-mesh'
import {useDocumentHistory} from './use-document-history'
import {useDocumentHistoryShortcuts} from './use-document-history-shortcuts'
import type {PlayerCanvasStatus} from './PlayerCanvas'
import {EditorStyles} from './internal/EditorStyles'
export interface PuppetEditorProps {
  readonly initialDocument?: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
}
const downloadDocument = (document: PuppetDocument) => {
  const source = serializeDocument(document)
  const url = URL.createObjectURL(new Blob([source], {type: 'application/json'}))
  const anchor = window.document.createElement('a')
  anchor.download = 'puppet-model.json'
  anchor.href = url
  window.document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
const setPlayerPlayback = (player: Player, isPlaying: boolean) => {
  if (isPlaying) {
    player.play()
    return
  }
  player.pause()
}
const togglePlayerPlayback = (player: Player, isPlaying: boolean) => {
  const nextIsPlaying = !isPlaying
  setPlayerPlayback(player, nextIsPlaying)
  return nextIsPlaying
}
const syncPlayerPlayback = (player: Player | null, isPlaying: boolean) => {
  if (player !== null && !isPlaying) {
    player.pause()
  }
  return player
}
interface EditorWorkspacePanelProps {
  readonly currentTime: number
  readonly document: PuppetDocument
  readonly editor: ParameterEditorResult
  readonly isPlaying: boolean
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onPlaybackToggle?: () => void
  readonly onSeek?: (time: number) => void
  readonly selectedNodeIds: ReadonlyArray<string>
  readonly workspace: 'animation' | 'modeling'
}
const EditorWorkspacePanel = (props: EditorWorkspacePanelProps) => (
  <Show
    when={props.workspace === 'modeling'}
    fallback={
      <EditorTimeline
        currentTime={props.currentTime}
        document={props.document}
        isPlaying={props.isPlaying}
        onDocumentChange={props.onDocumentChange}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        onPlaybackToggle={props.onPlaybackToggle}
        onSeek={props.onSeek}
        parameterValues={props.editor.parameterValueMap()}
      />
    }
  >
    <section class="modeling-panel" aria-label="Parameter와 키폼 편집">
      <EditorModelingKeyformPanel
        document={props.document}
        editor={props.editor}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        selectedNodeIds={props.selectedNodeIds}
      />
    </section>
  </Show>
)

// eslint-disable-next-line max-lines-per-function
export const PuppetEditor = (props: PuppetEditorProps) => {
  const initialDocument = untrack(() => props.initialDocument ?? createDemoDocument())
  const initialPartId = initialDocument.parts[0]?.id ?? null
  const history = useDocumentHistory({initialDocument})
  const sourceDocument = history.document
  const skinSession = createSkinSession()
  const [activePartId, setActivePartId] = createSignal<string | null>(initialPartId)
  const [layerSelection, setLayerSelection] = createSignal(createSceneSelection(initialPartId))
  const [glueVertex, setGlueVertex] = createSignal<PuppetVertexReference | null>(null)
  const [activeVertexIndex, setActiveVertexIndex] = createSignal<number | null>(null)
  const deformerEditing = useDeformerMode({
    document: sourceDocument,
    nodeId: () => layerSelection().activeNodeId ?? undefined,
    onDocumentChange: history.setDocument,
  })
  const deformerControlSelection = createDeformerControlSelection()
  const [workspace, setWorkspace] = createSignal<'animation' | 'modeling'>('modeling')
  const [playerStatus, setPlayerStatus] = createSignal<PlayerCanvasStatus>('loading')
  const [player, setPlayer] = createSignal<Player | null>(null)
  const [currentTime, setCurrentTime] = createSignal(0)
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [inspectorMount, setInspectorMount] = createSignal<HTMLDivElement>()
  const [notice, setNotice] = createSignal<string | null>(null)
  const [maskPickSourcePartId, setMaskPickSourcePartId] = createSignal<string | null>(null)
  const selectedPartIds = createMemo(() =>
    getSceneSelectionPartIds(sourceDocument(), layerSelection()),
  )
  const selectedNodeIds = createMemo(() =>
    getParameterSelectionNodeIds({document: sourceDocument(), selection: layerSelection()}),
  )
  const selectionActions = createMemo(() =>
    getSceneSelectionActions(sourceDocument(), layerSelection()),
  )
  const parameterEditor = useParameterEditor({
    document: sourceDocument,
    onDocumentChange: history.setDocument,
    onNotice: setNotice,
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
  const parameterPreviewDocument = createMemo(() =>
    createParameterPreview({
      document: temporary.document(),
      editingBindingId: workspace() === 'modeling' ? temporary.bindingId() : undefined,
      parameterValues: temporary.valueMap(),
    }),
  )
  const resetEditorDocument = (document: PuppetDocument) => {
    const partId = document.parts[0]?.id ?? null
    batch(() => {
      temporary.reset()
      history.resetDocument(document)
      setActivePartId(partId)
      setLayerSelection(createSceneSelection(partId))
      setActiveVertexIndex(null)
      setMaskPickSourcePartId(null)
      deformerControlSelection.clear()
      parameterEditor.reset(document)
    })
  }
  const editorImports = useEditorImports({
    onDocumentChange: resetEditorDocument,
    onNotice: setNotice,
  })
  const pausePlayback = () => {
    const currentPlayer = player()
    if (currentPlayer !== null && isPlaying()) {
      currentPlayer.pause()
      setIsPlaying(false)
    }
  }
  const handleDocumentEditStart = () => {
    pausePlayback()
    history.beginTransaction()
  }
  const handleUndo = () => {
    const changed = history.undo()
    if (changed) {
      pausePlayback()
    }
    return changed
  }
  const handleRedo = () => {
    const changed = history.redo()
    if (changed) {
      pausePlayback()
    }
    return changed
  }
  const activateHistoryShortcuts = useDocumentHistoryShortcuts({
    onRedo: handleRedo,
    onUndo: handleUndo,
  })
  const autoMesh = useAutoMesh({
    document: sourceDocument,
    onBeforeApply: pausePlayback,
    onDocumentChange(document) {
      history.setDocument(document)
      setActiveVertexIndex(null)
    },
    onNotice: setNotice,
    partIds: () => selectionActions().autoMeshPartIds,
  })

  createEffect(() => {
    const document = sourceDocument()
    untrack(() => props.onDocumentChange)?.(document)
  })
  const handlePlayerChange = (nextPlayer: Player | null) => {
    setPlayer(syncPlayerPlayback(nextPlayer, isPlaying()))
  }

  const handlePlaybackToggle = () => {
    const currentPlayer = player()

    if (currentPlayer !== null) {
      setIsPlaying(togglePlayerPlayback(currentPlayer, isPlaying()))
    }
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
        setActivePartId(null)
        setActiveVertexIndex(null)
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
    setNotice(`${targetPartId} 레이어에 마스크를 적용했습니다.`)
  }

  return (
    <SkinSessionContext.Provider value={skinSession}>
      <EditorStyles />
      <EditorPanelLayout
        onActivate={activateHistoryShortcuts}
        bottom={
          <EditorWorkspacePanel
            currentTime={currentTime()}
            document={sourceDocument()}
            editor={parameterEditor}
            isPlaying={isPlaying()}
            onDocumentChange={handleTimelineDocumentChange}
            onEditEnd={history.endTransaction}
            onEditStart={handleDocumentEditStart}
            onPlaybackToggle={player() === null ? undefined : handlePlaybackToggle}
            onSeek={player() === null ? undefined : (time) => player()?.seek(time)}
            selectedNodeIds={selectedNodeIds()}
            workspace={workspace()}
          />
        }
        inspector={
          <EditorInspector
            activeBindingId={temporary.bindingId()}
            activeKeyformValues={temporary.values()}
            activeNodeId={selectionActions().singleNodeId}
            autoMeshAvailable={workspace() === 'modeling' && autoMesh.targets().length > 0}
            containerUnwrapAvailable={selectionActions().containerIds.length > 0}
            document={temporary.document()}
            editMode={workspace() === 'modeling' ? 'parameter' : 'motion'}
            maskPickSourcePartId={maskPickSourcePartId() ?? undefined}
            notice={notice()}
            onAutoMesh={() => autoMesh.onOpenChange(true)}
            onContainerUnwrap={handleContainerUnwrap}
            onDocumentChange={(document) => {
              if (temporary.target() === undefined) {
                deformerEditing.updateInspector(document)
              } else {
                temporary.update(document)
              }
            }}
            onEditEnd={history.endTransaction}
            onEditStart={handleDocumentEditStart}
            onMaskPickCancel={() => setMaskPickSourcePartId(null)}
            onMaskPickStart={(partId) => {
              setMaskPickSourcePartId(partId)
              setNotice('마스크를 적용할 대상 레이어를 왼쪽 패널에서 선택하세요.')
            }}
            previewDocument={parameterPreviewDocument()}
            selectedControlPointIndices={deformerControlSelection.selectedPointIndices()}
            targetNodeIds={temporary.targets()}
          >
            <div ref={setInspectorMount} />
            <SkinningEditor
              selectedNodeIds={layerSelection().nodeIds}
              document={sourceDocument()}
              previewDocument={parameterPreviewDocument()}
              partId={activePartId() ?? undefined}
              vertexIndex={activeVertexIndex() ?? undefined}
              onDocumentChange={history.setDocument}
              onEditStart={handleDocumentEditStart}
              onEditEnd={history.endTransaction}
            />
            <GlueEditor
              selectedPartIds={selectedPartIds()}
              targetPartId={layerSelection().activeNodeId ?? undefined}
              sourceVertex={glueVertex()}
              onSourceChange={setGlueVertex}
              document={sourceDocument()}
              partId={activePartId() ?? undefined}
              vertexIndex={activeVertexIndex()}
              onDocumentChange={history.setDocument}
              onEditStart={handleDocumentEditStart}
              onEditEnd={history.endTransaction}
            />
          </EditorInspector>
        }
        layers={
          <EditorLayerPanel
            document={sourceDocument()}
            maskPickSourcePartId={maskPickSourcePartId() ?? undefined}
            selection={layerSelection()}
            onDocumentChange={history.setDocument}
            onMaskPick={handleMaskPick}
            onSelectionChange={(selection) => {
              if (skinSession.pick(sourceDocument(), selection.activeNodeId)) {
                return
              }
              temporary.hide()
              setMaskPickSourcePartId(null)
              setLayerSelection(selection)
              setActivePartId(getSelectedPartId(sourceDocument(), selection))
              setActiveVertexIndex(null)
              deformerControlSelection.clear()
            }}
          />
        }
        toolbar={(visibility) => (
          <EditorToolbar
            activeWorkspace={workspace()}
            canRedo={history.canRedo()}
            canUndo={history.canUndo()}
            historyRedoCount={history.redoCount()}
            historyUndoCount={history.undoCount()}
            panelVisibility={visibility}
            playerStatus={playerStatus()}
            onRedo={handleRedo}
            onExport={() => downloadDocument(sourceDocument())}
            onJsonImport={editorImports.handleImport}
            onPsdImport={editorImports.handlePsdImport}
            onPngImport={editorImports.handlePngImport}
            onUndo={handleUndo}
            onWorkspaceChange={(nextWorkspace) => {
              pausePlayback()
              temporary.hide()
              setWorkspace(nextWorkspace)
            }}
          />
        )}
        viewport={
          <EditorViewport
            meshEditingDisabled={temporary.form() !== undefined}
            onMeshEditingStart={() => {
              pausePlayback()
              temporary.hide()
            }}
            onRestDocumentChange={history.setDocument}
            fitRevision={editorImports.revision()}
            overlay={
              <Show
                when={
                  workspace() === 'modeling' &&
                  temporary.form() !== undefined &&
                  layerSelection().activeNodeId
                }
                keyed
              >
                {(nodeId) => (
                  <TemporaryFormButton
                    nodeId={nodeId}
                    selected={temporary.selected()}
                    showing={temporary.showing()}
                    onPreview={temporary.setPreview}
                    onRemove={temporary.remove}
                    onSave={temporary.save}
                  />
                )}
              </Show>
            }
            sourceDocument={sourceDocument()}
            deformerMode={deformerEditing.mode()}
            onDeformerModeChange={deformerEditing.setMode}
            renderEditingControls={(controls) => (
              <Show when={inspectorMount()}>
                {(mount) => <Portal mount={mount()}>{controls}</Portal>}
              </Show>
            )}
            activeBindingId={temporary.bindingId()}
            activeKeyformValues={temporary.values()}
            activeNodeId={layerSelection().activeNodeId ?? undefined}
            activePartId={activePartId() ?? undefined}
            activeVertexIndex={activeVertexIndex()}
            currentTime={currentTime()}
            deformerControlSelection={deformerControlSelection}
            document={temporary.document()}
            editMode={workspace() === 'modeling' ? 'parameter' : 'motion'}
            onDeformerEditEnd={history.endTransaction}
            onDeformerEditStart={handleDocumentEditStart}
            onDocumentChange={temporary.update}
            onNotice={(message) => setNotice(temporary.target() === undefined ? message : null)}
            onPlayerChange={handlePlayerChange}
            onStatusChange={setPlayerStatus}
            onTimeChange={setCurrentTime}
            onVertexEditStart={pausePlayback}
            onVertexSelect={setActiveVertexIndex}
            parameterValues={temporary.target()?.values ?? parameterEditor.parameterValues()}
            parameterValueMap={temporary.valueMap()}
            previewDocument={parameterPreviewDocument()}
            selectedPartIds={selectedPartIds()}
            targetNodeIds={temporary.targets()}
          />
        }
      />
      <EditorAutoMeshDialog autoMesh={autoMesh} />
    </SkinSessionContext.Provider>
  )
}
