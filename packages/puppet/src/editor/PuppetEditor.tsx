import {createEffect, createMemo, createSignal, onCleanup, Show, untrack} from 'solid-js'

import {
  createDemoDocument,
  type Player,
  type PlayerFrame,
  preparePuppetDocument,
  type PuppetDocument,
  serializeDocument,
} from '../player'
import {importPng, type ImportPngErrorCode} from './import-png'
import {EditorInspector} from './internal/EditorInspector'
import {EditorKeyformPanel} from './internal/EditorKeyformPanel'
import {EditorLayerPanel} from './internal/EditorLayerPanel'
import {getDocumentParameters} from './internal/parameter-keyforms'
import {getSceneNode, getSceneSelectionPartIds, type SceneSelection} from './internal/scene-graph'
import {EditorPanelLayout} from './internal/EditorPanelLayout'
import {EditorTimeline} from './internal/EditorTimeline'
import {EditorToolbar} from './internal/EditorToolbar'
import {MeshEditor} from './MeshEditor'
import {type ParameterEditorResult, useParameterEditor} from './use-parameter-editor'
import {PlayerCanvas, type PlayerCanvasStatus} from './PlayerCanvas'
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

const getSelectedPartId = (document: PuppetDocument, selection: SceneSelection) => {
  const {activeNodeId} = selection
  const node = activeNodeId === null ? undefined : getSceneNode(document, activeNodeId)
  return node?.kind === 'part' ? node.id : null
}

const createSceneSelection = (partId: string | null): SceneSelection => ({
  activeNodeId: partId,
  nodeIds: partId === null ? [] : [partId],
})

interface EditorViewportProps {
  readonly activeKeyformValue?: number | null
  readonly activeParameterId?: string
  readonly activePartId?: string
  readonly activeVertexIndex?: number | null
  readonly currentTime?: number
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onNotice?: (message: string) => void
  readonly onPlayerChange?: (player: Player | null) => void
  readonly onStatusChange?: (status: PlayerCanvasStatus) => void
  readonly onTimeChange?: (time: number) => void
  readonly onVertexEditStart?: () => void
  readonly onVertexSelect?: (vertexIndex: number | null) => void
  readonly parameterValue?: number
  readonly previewDocument?: PuppetDocument
  readonly selectedPartIds?: ReadonlyArray<string>
}

const EditorViewport = (props: EditorViewportProps) => (
  <section
    aria-label={
      props.editMode === 'parameter' ? 'Parameter 정점 형태 편집' : '저장 데이터 플레이어 미리보기'
    }
    class="viewport-panel"
  >
    <div class="viewport">
      <PlayerCanvas
        document={props.previewDocument ?? props.document}
        onFrame={(frame: PlayerFrame) => props.onTimeChange?.(frame.time)}
        onPlayerChange={props.onPlayerChange}
        onStatusChange={props.onStatusChange}
      />
      <MeshEditor
        activeKeyformValue={props.activeKeyformValue}
        activeParameterId={props.activeParameterId}
        activePartId={props.activePartId}
        document={props.document}
        editMode={props.editMode}
        onDocumentChange={props.onDocumentChange}
        onNotice={props.onNotice}
        onVertexEditStart={props.onVertexEditStart}
        onVertexSelect={props.onVertexSelect}
        previewTime={props.currentTime}
        parameterValue={props.parameterValue}
        selectedPartIds={props.selectedPartIds}
        selectedVertexIndex={props.activeVertexIndex}
      />
    </div>
  </section>
)

interface EditorModelingKeyformPanelProps {
  readonly document: PuppetDocument
  readonly editor: ParameterEditorResult
  readonly selectedPartIds: ReadonlyArray<string>
}

const EditorModelingKeyformPanel = (props: EditorModelingKeyformPanelProps) => (
  <EditorKeyformPanel
    activeKeyformValue={props.editor.activeKeyformValue()}
    activeParameterId={props.editor.activeParameterId() ?? undefined}
    parameters={getDocumentParameters(props.document)}
    selectedPartIds={props.selectedPartIds}
    targetPartIds={props.editor.activeTargetPartIds()}
    value={props.editor.parameterValue()}
    onKeyformAdd={props.editor.addKeyform}
    onKeyformDelete={props.editor.deleteKeyform}
    onKeyformMove={(parameterId, value, nextValue) => {
      props.editor.selectParameter(parameterId)
      props.editor.moveKeyform(value, nextValue)
    }}
    onKeyformSelect={(parameterId, value) => {
      props.editor.selectParameter(parameterId)
      props.editor.selectKeyform(value)
    }}
    onParameterAdd={props.editor.addParameter}
    onParameterDelete={props.editor.deleteParameter}
    onParameterNameChange={(parameterId, name) => {
      props.editor.selectParameter(parameterId)
      props.editor.renameParameter(name)
    }}
    onParameterSelect={props.editor.selectParameter}
    onSelectionConnect={props.editor.connectSelection}
    onSelectionDisconnect={props.editor.disconnectSelection}
    onValueChange={props.editor.setParameterValue}
  />
)

interface EditorModelingPanelProps {
  readonly document: PuppetDocument
  readonly editor: ParameterEditorResult
  readonly selectedPartIds: ReadonlyArray<string>
}

const EditorModelingPanel = (props: EditorModelingPanelProps) => (
  <section class="modeling-panel" aria-label="Parameter와 키폼 편집">
    <EditorModelingKeyformPanel
      document={props.document}
      editor={props.editor}
      selectedPartIds={props.selectedPartIds}
    />
  </section>
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

export const PuppetEditor = (props: PuppetEditorProps) => {
  const initialDocument = untrack(() => props.initialDocument ?? createDemoDocument())
  const initialPartId = initialDocument.parts[0]?.id ?? null
  const [sourceDocument, setSourceDocument] = createSignal(initialDocument)
  const [activePartId, setActivePartId] = createSignal<string | null>(initialPartId)
  const [layerSelection, setLayerSelection] = createSignal(createSceneSelection(initialPartId))
  const [activeVertexIndex, setActiveVertexIndex] = createSignal<number | null>(null)
  const [workspace, setWorkspace] = createSignal<'animation' | 'modeling'>('modeling')
  const [playerStatus, setPlayerStatus] = createSignal<PlayerCanvasStatus>('loading')
  const [player, setPlayer] = createSignal<Player | null>(null)
  const [currentTime, setCurrentTime] = createSignal(0)
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [notice, setNotice] = createSignal<string | null>(null)
  const selectedPartIds = createMemo(() =>
    getSceneSelectionPartIds(sourceDocument(), layerSelection()),
  )
  const parameterEditor = useParameterEditor({
    document: sourceDocument,
    onDocumentChange: setSourceDocument,
    onNotice: setNotice,
    selectedPartIds,
  })
  const resetEditorDocument = (document: PuppetDocument) => {
    const partId = document.parts[0]?.id ?? null
    setSourceDocument(document)
    setActivePartId(partId)
    setLayerSelection(createSceneSelection(partId))
    setActiveVertexIndex(null)
    parameterEditor.reset(document)
  }
  const editorImports = useEditorImports({
    onDocumentChange: resetEditorDocument,
    onNotice: setNotice,
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

  const pausePlayback = () =>
    pauseEditorPlayback({pause: () => setIsPlaying(false), player: player(), playing: isPlaying()})

  const handleTimelineDocumentChange = (document: PuppetDocument) => {
    pausePlayback()
    setSourceDocument(document)
  }

  return (
    <>
      <style>{editorStyle}</style>
      <EditorPanelLayout
        bottom={
          <Show
            when={workspace() === 'modeling'}
            fallback={
              <EditorTimeline
                activePartId={activePartId() ?? undefined}
                activeVertexIndex={activeVertexIndex()}
                currentTime={currentTime()}
                document={sourceDocument()}
                isPlaying={isPlaying()}
                onDocumentChange={handleTimelineDocumentChange}
                onPlaybackToggle={player() === null ? undefined : handlePlaybackToggle}
                onSeek={player() === null ? undefined : (time) => player()?.seek(time)}
                onTargetSelect={(partId, vertexIndex) => {
                  setActivePartId(partId)
                  setLayerSelection({activeNodeId: partId, nodeIds: [partId]})
                  setActiveVertexIndex(vertexIndex)
                }}
              />
            }
          >
            <EditorModelingPanel
              document={sourceDocument()}
              editor={parameterEditor}
              selectedPartIds={selectedPartIds()}
            />
          </Show>
        }
        inspector={
          <EditorInspector
            activePartId={activePartId() ?? undefined}
            document={sourceDocument()}
            notice={notice()}
          />
        }
        layers={
          <EditorLayerPanel
            document={sourceDocument()}
            selection={layerSelection()}
            onDocumentChange={setSourceDocument}
            onSelectionChange={(selection) => {
              setLayerSelection(selection)
              setActivePartId(getSelectedPartId(sourceDocument(), selection))
              setActiveVertexIndex(null)
            }}
          />
        }
        toolbar={(visibility) => (
          <EditorToolbar
            activeWorkspace={workspace()}
            panelVisibility={visibility}
            playerStatus={playerStatus()}
            onExport={() => downloadDocument(sourceDocument())}
            onJsonImport={editorImports.handleImport}
            onPngImport={editorImports.handlePngImport}
            onWorkspaceChange={(nextWorkspace) => {
              pausePlayback()
              setWorkspace(nextWorkspace)
            }}
          />
        )}
        viewport={
          <EditorViewport
            activeKeyformValue={parameterEditor.activeKeyformValue()}
            activeParameterId={parameterEditor.activeParameterId() ?? undefined}
            activePartId={activePartId() ?? undefined}
            activeVertexIndex={activeVertexIndex()}
            currentTime={currentTime()}
            document={sourceDocument()}
            editMode={workspace() === 'modeling' ? 'parameter' : 'motion'}
            onDocumentChange={setSourceDocument}
            onNotice={setNotice}
            onPlayerChange={handlePlayerChange}
            onStatusChange={setPlayerStatus}
            onTimeChange={setCurrentTime}
            onVertexEditStart={pausePlayback}
            onVertexSelect={setActiveVertexIndex}
            parameterValue={parameterEditor.parameterValue()}
            previewDocument={
              workspace() === 'modeling' ? parameterEditor.previewDocument() : sourceDocument()
            }
            selectedPartIds={selectedPartIds()}
          />
        }
      />
    </>
  )
}
