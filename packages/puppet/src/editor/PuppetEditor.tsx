import {createEffect, createSignal, onCleanup, Show, untrack} from 'solid-js'

import {createDemoDocument, parseDocument, type PuppetDocument, serializeDocument} from '../player'
import {importPng, type ImportPngErrorCode} from './import-png'
import {EditorInspector} from './internal/EditorInspector'
import {EditorLayerPanel} from './internal/EditorLayerPanel'
import {EditorTimeline} from './internal/EditorTimeline'
import {EditorToolbar} from './internal/EditorToolbar'
import {MeshEditor} from './MeshEditor'
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

  const result = parseDocument(await options.file.text())

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

export const PuppetEditor = (props: PuppetEditorProps) => {
  const initialDocument = untrack(() => props.initialDocument ?? createDemoDocument())
  const [sourceDocument, setSourceDocument] = createSignal(initialDocument)
  const [activePartId, setActivePartId] = createSignal<string | null>(
    initialDocument.parts[0]?.id ?? null,
  )
  const [playerStatus, setPlayerStatus] = createSignal<PlayerCanvasStatus>('loading')
  const [notice, setNotice] = createSignal<string | null>(null)
  let importGeneration = 0

  onCleanup(() => {
    importGeneration += 1
  })

  createEffect(() => {
    props.onDocumentChange?.(sourceDocument())
  })

  const handleImport = (file: File | undefined) => {
    if (file === undefined) {
      return
    }

    importGeneration += 1
    const activeGeneration = importGeneration
    importDocument({
      file,
      onFailure(message) {
        if (activeGeneration === importGeneration) {
          setNotice(message)
        }
      },
      onSuccess(document, fileName) {
        if (activeGeneration === importGeneration) {
          setSourceDocument(document)
          setActivePartId(document.parts[0]?.id ?? null)
          setNotice(`${fileName}을 불러왔습니다.`)
        }
      },
    }).catch(() => {
      if (activeGeneration === importGeneration) {
        setNotice('파일을 읽지 못했습니다.')
      }
    })
  }

  const handlePngImport = (file: File | undefined) => {
    if (file === undefined) {
      return
    }

    importGeneration += 1
    const activeGeneration = importGeneration
    importPng(file)
      .then((result) => {
        if (activeGeneration !== importGeneration) {
          return
        }

        if (!result.ok) {
          setNotice(getPngErrorMessage(result.error.code))
          return
        }

        setSourceDocument(result.document)
        setActivePartId(result.document.parts[0]?.id ?? null)
        setNotice(`${file.name}에서 알파 기반 메시를 생성했습니다.`)
      })
      .catch(() => {
        if (activeGeneration === importGeneration) {
          setNotice('PNG를 불러오는 중 예상하지 못한 오류가 발생했습니다.')
        }
      })
  }

  return (
    <>
      <style>{editorStyle}</style>
      <main class="puppet-editor">
        <EditorToolbar
          playerStatus={playerStatus()}
          onExport={() => downloadDocument(sourceDocument())}
          onJsonImport={handleImport}
          onPngImport={handlePngImport}
        />

        <EditorLayerPanel
          activePartId={activePartId() ?? undefined}
          document={sourceDocument()}
          onPartSelect={setActivePartId}
        />

        <section class="viewport-panel" aria-labelledby="viewport-title">
          <div class="viewport-heading">
            <div>
              <span>Viewport</span>
              <h1 id="viewport-title">저장 데이터 플레이어 미리보기</h1>
            </div>
            <span class="zoom-label">AUTO</span>
          </div>
          <div class="viewport">
            <PlayerCanvas document={sourceDocument()} onStatusChange={setPlayerStatus} />
            <Show when={playerStatus() === 'loading'}>
              <p class="viewport-message">JSON을 검증한 뒤 플레이어에 적용하고 있습니다.</p>
            </Show>
            <MeshEditor
              activePartId={activePartId() ?? undefined}
              document={sourceDocument()}
              onDocumentChange={setSourceDocument}
              onNotice={setNotice}
            />
          </div>
        </section>

        <EditorInspector
          activePartId={activePartId() ?? undefined}
          document={sourceDocument()}
          notice={notice()}
        />

        <EditorTimeline document={sourceDocument()} />
      </main>
    </>
  )
}
