import {batch, createEffect, createMemo, createSignal, onCleanup, Show, untrack} from 'solid-js'

import {
  createDemoDocument,
  type Player,
  preparePuppetDocument,
  type PuppetDocument,
  serializeDocument,
} from '../player'
import type {PuppetParameterValues} from '../deformation'
import {EditorViewport} from './EditorViewport'
import {importPng, type ImportPngErrorCode} from './import-png'
import {createDeformerControlSelection} from './internal/deformer-control-selection'
import {EditorAutoMeshDialog} from './internal/EditorAutoMeshDialog'
import {EditorInspector} from './internal/EditorInspector'
import {EditorKeyformPanel} from './internal/EditorKeyformPanel'
import {EditorLayerPanel} from './internal/EditorLayerPanel'
import {
  getDocumentParameterBindings,
  getDocumentParameters,
  getParameterBindingsForNodeIds,
} from './internal/parameter-keyforms'
import {createParameterPreview} from './internal/parameter-sampling'
import {getParameterSelectionNodeIds} from './internal/parameter-targets'
import {convertSceneContainers} from './internal/container-conversion'
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
import editorStyle from './style.css?inline'

export interface PuppetEditorProps {
  readonly initialDocument?: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
}

interface ImportDocumentOptions {
  readonly file?: File
  readonly onFailure: (message: string) => void
  readonly onSuccess: (document: PuppetDocument, fileName: string) => void
  readonly signal: AbortSignal
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

const importDocument = async (options: ImportDocumentOptions) => {
  if (options.file === undefined) {
    return
  }

  const result = await preparePuppetDocument({
    signal: options.signal,
    source: await options.file.text(),
  })

  if (!result.ok) {
    options.onFailure('Puppet 문서가 아니거나 JSON 형식이 올바르지 않습니다.')
    return
  }

  options.onSuccess(result.document, options.file.name)
}

const getPngErrorMessage = (code: ImportPngErrorCode) => {
  switch (code) {
    case 'decode-failed':
      return 'PNG 이미지를 해석하지 못했습니다.'
    case 'invalid-file':
      return 'PNG 파일만 불러올 수 있습니다.'
    case 'no-opaque-pixels':
      return '불투명한 픽셀이 없어 메시를 만들 수 없습니다.'
    case 'read-failed':
      return 'PNG 파일을 읽지 못했습니다.'
    case 'render-failed':
      return 'PNG 픽셀을 분석할 캔버스를 만들지 못했습니다.'
    case 'too-large':
      return '이미지가 너무 큽니다. 1,677만 픽셀 이하 PNG를 사용하세요.'
    case 'invalid-alpha-threshold':
    case 'invalid-cell-size':
    case 'invalid-pixel-data':
      return 'PNG 메시 생성 설정이 올바르지 않습니다.'
    default: {
      const exhaustiveCode: never = code
      return exhaustiveCode
    }
  }
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

interface PauseEditorPlaybackOptions {
  readonly pause: () => void
  readonly player: Player | null
  readonly playing: boolean
}

const pauseEditorPlayback = (options: PauseEditorPlaybackOptions) => {
  if (options.player !== null && options.playing) {
    options.player.pause()
    options.pause()
  }
}

interface EditorModelingKeyformPanelProps {
  readonly document: PuppetDocument
  readonly editor: ParameterEditorResult
  readonly selectedNodeIds: ReadonlyArray<string>
}

const EditorModelingKeyformPanel = (props: EditorModelingKeyformPanelProps) => {
  const bindings = () =>
    props.editor.allParametersVisible()
      ? getDocumentParameterBindings(props.document)
      : getParameterBindingsForNodeIds(props.document, props.selectedNodeIds)

  return (
    <EditorKeyformPanel
      activeBindingId={props.editor.activeBindingId() ?? undefined}
      activeKeyformValues={props.editor.activeKeyformValues()}
      allParametersVisible={props.editor.allParametersVisible()}
      bindings={bindings()}
      parameters={getDocumentParameters(props.document)}
      parameterCreationAvailable={props.selectedNodeIds.length > 0}
      parameterValueMap={props.editor.parameterValueMap()}
      selectedPartIds={props.selectedNodeIds}
      targetPartIds={props.editor.activeTargetNodeIds()}
      values={props.editor.parameterValues()}
      onKeyformAdd={props.editor.addKeyform}
      onKeyformDelete={props.editor.deleteKeyform}
      onKeyformMove={(bindingId, values, nextValues) => {
        props.editor.selectBinding(bindingId)
        props.editor.moveKeyform(values, nextValues)
      }}
      onKeyformSelect={(bindingId, values) => {
        props.editor.selectBinding(bindingId)
        props.editor.selectKeyform(values)
      }}
      onBindingDelete={props.editor.deleteParameter}
      onBindingSelect={props.editor.selectBinding}
      onParameterAdd={props.editor.addParameter}
      onParameterNameChange={(bindingId, parameterId, name) => {
        props.editor.selectBinding(bindingId)
        props.editor.renameParameter(parameterId, name)
      }}
      onSelectionConnect={props.editor.connectSelection}
      onSelectionDisconnect={props.editor.disconnectSelection}
      onAllParametersVisibleChange={props.editor.setAllParametersVisible}
      onTwoDimensionalParameterAdd={props.editor.addTwoDimensionalParameter}
      onValueChange={props.editor.setParameterValues}
    />
  )
}

interface EditorWorkspacePanelProps {
  readonly currentTime: number
  readonly document: PuppetDocument
  readonly editor: ParameterEditorResult
  readonly isPlaying: boolean
  readonly onDocumentChange: (document: PuppetDocument) => void
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
        selectedNodeIds={props.selectedNodeIds}
      />
    </section>
  </Show>
)

interface UseEditorImportsOptions {
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onNotice: (message: string) => void
}

const useEditorImports = (options: UseEditorImportsOptions) => {
  let importGeneration = 0
  let importAbortController: AbortController | undefined

  onCleanup(() => {
    importGeneration += 1
    importAbortController?.abort()
  })

  const handleImport = (file: File | undefined) => {
    if (file === undefined) {
      return
    }

    importGeneration += 1
    importAbortController?.abort()
    const activeGeneration = importGeneration
    const abortController = new AbortController()
    importAbortController = abortController
    importDocument({
      file,
      onFailure(message) {
        if (activeGeneration === importGeneration) {
          options.onNotice(message)
        }
      },
      onSuccess(document, fileName) {
        if (activeGeneration === importGeneration) {
          options.onDocumentChange(document)
          options.onNotice(`${fileName}을 불러왔습니다.`)
        }
      },
      signal: abortController.signal,
    }).catch(() => {
      if (activeGeneration === importGeneration) {
        options.onNotice('파일을 읽지 못했습니다.')
      }
    })
  }

  const handlePngImport = (file: File | undefined) => {
    if (file === undefined) {
      return
    }

    importGeneration += 1
    importAbortController?.abort()
    const activeGeneration = importGeneration
    importPng(file)
      .then((result) => {
        if (activeGeneration !== importGeneration) {
          return
        }

        if (!result.ok) {
          options.onNotice(getPngErrorMessage(result.error.code))
          return
        }

        options.onDocumentChange(result.document)
        options.onNotice(`${file.name}에서 알파 기반 메시를 생성했습니다.`)
      })
      .catch(() => {
        if (activeGeneration === importGeneration) {
          options.onNotice('PNG를 불러오는 중 예상하지 못한 오류가 발생했습니다.')
        }
      })
  }

  return {handleImport, handlePngImport}
}

// eslint-disable-next-line max-lines-per-function
export const PuppetEditor = (props: PuppetEditorProps) => {
  const initialDocument = untrack(() => props.initialDocument ?? createDemoDocument())
  const initialPartId = initialDocument.parts[0]?.id ?? null
  const history = useDocumentHistory({initialDocument})
  const sourceDocument = history.document
  const [activePartId, setActivePartId] = createSignal<string | null>(initialPartId)
  const [layerSelection, setLayerSelection] = createSignal(createSceneSelection(initialPartId))
  const [activeVertexIndex, setActiveVertexIndex] = createSignal<number | null>(null)
  const deformerControlSelection = createDeformerControlSelection()
  const [workspace, setWorkspace] = createSignal<'animation' | 'modeling'>('modeling')
  const [playerStatus, setPlayerStatus] = createSignal<PlayerCanvasStatus>('loading')
  const [player, setPlayer] = createSignal<Player | null>(null)
  const [currentTime, setCurrentTime] = createSignal(0)
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [notice, setNotice] = createSignal<string | null>(null)
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
  const parameterPreviewDocument = createMemo(() =>
    createParameterPreview({
      document: sourceDocument(),
      parameterValues: parameterEditor.parameterValueMap(),
    }),
  )
  const resetEditorDocument = (document: PuppetDocument) => {
    const partId = document.parts[0]?.id ?? null
    batch(() => {
      history.resetDocument(document)
      setActivePartId(partId)
      setLayerSelection(createSceneSelection(partId))
      setActiveVertexIndex(null)
      deformerControlSelection.clear()
      parameterEditor.reset(document)
    })
  }
  const editorImports = useEditorImports({
    onDocumentChange: resetEditorDocument,
    onNotice: setNotice,
  })
  const pausePlayback = () =>
    pauseEditorPlayback({pause: () => setIsPlaying(false), player: player(), playing: isPlaying()})
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
  const handleContainerConvert = () => {
    const conversion = selectionActions().containerConversion
    const document =
      conversion === undefined
        ? undefined
        : convertSceneContainers({...conversion, document: sourceDocument()})
    if (document !== undefined) {
      batch(() => {
        history.setDocument(document)
        setActiveVertexIndex(null)
      })
    }
  }

  return (
    <>
      <style>{editorStyle}</style>
      <EditorPanelLayout
        onActivate={activateHistoryShortcuts}
        bottom={
          <EditorWorkspacePanel
            currentTime={currentTime()}
            document={sourceDocument()}
            editor={parameterEditor}
            isPlaying={isPlaying()}
            onDocumentChange={handleTimelineDocumentChange}
            onPlaybackToggle={player() === null ? undefined : handlePlaybackToggle}
            onSeek={player() === null ? undefined : (time) => player()?.seek(time)}
            selectedNodeIds={selectedNodeIds()}
            workspace={workspace()}
          />
        }
        inspector={
          <EditorInspector
            activeBindingId={parameterEditor.activeBindingId() ?? undefined}
            activeKeyformValues={parameterEditor.activeKeyformValues()}
            activeNodeId={selectionActions().singleNodeId}
            autoMeshAvailable={workspace() === 'modeling' && autoMesh.targets().length > 0}
            containerConversionTarget={selectionActions().containerConversion?.targetKind}
            containerUnwrapAvailable={selectionActions().containerIds.length > 0}
            document={sourceDocument()}
            editMode={workspace() === 'modeling' ? 'parameter' : 'motion'}
            notice={notice()}
            onAutoMesh={() => autoMesh.onOpenChange(true)}
            onContainerConvert={handleContainerConvert}
            onContainerUnwrap={handleContainerUnwrap}
            onDocumentChange={history.setDocument}
            previewDocument={parameterPreviewDocument()}
            selectedControlPointIndices={deformerControlSelection.selectedPointIndices()}
            targetNodeIds={parameterEditor.activeTargetNodeIds()}
          />
        }
        layers={
          <EditorLayerPanel
            document={sourceDocument()}
            selection={layerSelection()}
            onDocumentChange={history.setDocument}
            onSelectionChange={(selection) => {
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
            onPngImport={editorImports.handlePngImport}
            onUndo={handleUndo}
            onWorkspaceChange={(nextWorkspace) => {
              pausePlayback()
              setWorkspace(nextWorkspace)
            }}
          />
        )}
        viewport={
          <EditorViewport
            activeBindingId={parameterEditor.activeBindingId() ?? undefined}
            activeKeyformValues={parameterEditor.activeKeyformValues()}
            activeNodeId={layerSelection().activeNodeId ?? undefined}
            activePartId={activePartId() ?? undefined}
            activeVertexIndex={activeVertexIndex()}
            currentTime={currentTime()}
            deformerControlSelection={deformerControlSelection}
            document={sourceDocument()}
            editMode={workspace() === 'modeling' ? 'parameter' : 'motion'}
            onDeformerEditEnd={history.endTransaction}
            onDeformerEditStart={() => {
              pausePlayback()
              history.beginTransaction()
            }}
            onDocumentChange={workspace() === 'modeling' ? history.setDocument : undefined}
            onNotice={setNotice}
            onPlayerChange={handlePlayerChange}
            onStatusChange={setPlayerStatus}
            onTimeChange={setCurrentTime}
            onVertexEditStart={pausePlayback}
            onVertexSelect={setActiveVertexIndex}
            parameterValues={parameterEditor.parameterValues()}
            parameterValueMap={parameterEditor.parameterValueMap()}
            previewDocument={parameterPreviewDocument()}
            selectedPartIds={selectedPartIds()}
            targetNodeIds={parameterEditor.activeTargetNodeIds()}
          />
        }
      />
      <EditorAutoMeshDialog autoMesh={autoMesh} />
    </>
  )
}
