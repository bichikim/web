import {createSignal, Show, untrack} from 'solid-js'
import {
  type DocumentRecovery,
  DocumentRecoveryDialog,
  type EditorController,
  type EditorHeaderMounts,
  EditorToast,
  FileLoadingDialog,
  type ModelBinding,
  PsdReimportDialog,
  PuppetEditor,
  type PuppetExampleDocument,
  useInitialAtlasUnpack,
} from '@winter-love/puppet/editor'
import type {PuppetDocument} from '@winter-love/puppet/player'
import {EditorToolbar} from './EditorToolbar'
import {useEditorImports} from './use-editor-imports'
import {useDocumentExport} from './use-document-export'
import {useWorkspace} from '../workspace/context'

export interface PoffoEditorProps {
  /** Shared Poffo model; owned above the retained pages. */
  readonly model: ModelBinding
  /** File examples shown in the service menu; omitted for no examples. */
  readonly examples?: ReadonlyArray<PuppetExampleDocument>
  /** Initial local motion; omitted to select the first motion. */
  readonly initialMotionId?: string
  /** Initial local mode; omitted for modeling. */
  readonly initialWorkspace?: 'animation' | 'modeling'
  /** Recovery storage; omitted to hide the recovery action. */
  readonly recovery?: DocumentRecovery
  /** Host activation state; omitted for active input. */
  readonly active?: boolean
  /** Reports the retained editor's instance handle. */
  readonly onControl?: (control: EditorController) => void
}

export const PoffoEditor = (props: PoffoEditorProps) => {
  const workspace = useWorkspace()
  const [control, setControl] = createSignal<EditorController>()
  const [notice, setNotice] = createSignal<string | null>(null)
  const [recoveryOpen, setRecoveryOpen] = createSignal(false)
  let returnFocus: (() => void) | undefined
  let sequence = 0
  const source = () => props.model.document()
  const replace = (document: PuppetDocument, title = '문서 불러오기') => {
    sequence += 1
    const result = props.model.request({
      document,
      expectedRevision: props.model.read().revision,
      ownerId: 'poffo-files',
      requestId: `poffo-files:${sequence}`,
      title,
      type: 'replace',
    })
    if (!result.ok) {
      setNotice('진행 중인 편집을 마친 후 다시 시도하세요.')
    }
    return result
  }
  const imports = useEditorImports({
    document: source,
    onDocumentChange: replace,
    onNotice: setNotice,
    onReimportDocumentChange: (document) => {
      sequence += 1
      return props.model.request({
        document,
        expectedRevision: props.model.read().revision,
        ownerId: 'poffo-files',
        requestId: `poffo-files:${sequence}`,
        title: 'PSD 다시 가져오기',
        type: 'edit',
      })
    },
    revision: () => props.model.revision(),
  })
  useInitialAtlasUnpack({
    document: source,
    initialDocument: untrack(source),
    onDocumentChange: (document) => replace(document, '텍스처 아틀라스 해제'),
    onNotice: setNotice,
    revision: () => props.model.revision(),
  })
  const hasTemporaryChanges = () => control()?.getState().hasTemporaryChanges ?? false
  const exporting = useDocumentExport(source, hasTemporaryChanges, setNotice)
  const handleControl = (next: EditorController) => {
    setControl(next)
    workspace?.setEditorControl(next)
    props.onControl?.(next)
  }
  const openRecovery = (restoreFocus: () => void) => {
    returnFocus = restoreFocus
    setRecoveryOpen(true)
  }
  const exportDocument = () => {
    if (props.model.read().transaction !== null) {
      setNotice('진행 중인 편집을 마친 후 내보내세요.')
      return
    }
    exporting.exportDocument()
  }
  const exportAtlas = () => {
    if (props.model.read().transaction !== null) {
      setNotice('진행 중인 편집을 마친 후 내보내세요.')
      return
    }
    exporting.exportAtlasDocument()
  }
  const renderHeader = (editor: EditorController, mounts: EditorHeaderMounts) => (
    <EditorToolbar
      examples={props.examples}
      setBrushSettingsMount={mounts.setBrushSettingsMount}
      activeWorkspace={editor.getState().mode}
      canRedo={editor.getState().canRedo}
      canUndo={editor.getState().canUndo}
      historyRedoCount={editor.getState().redoCount}
      historyUndoCount={editor.getState().undoCount}
      panelVisibility={{
        get bottomOpen() {
          return editor.getState().panels.bottom
        },
        get leftOpen() {
          return editor.getState().panels.left
        },
        onBottomToggle: () => editor.commands.togglePanel('bottom'),
        onLeftToggle: () => editor.commands.togglePanel('left'),
        onRightToggle: () => editor.commands.togglePanel('right'),
        get rightOpen() {
          return editor.getState().panels.right
        },
      }}
      playerStatus={editor.getState().renderer}
      onRedo={editor.commands.redo}
      onUndo={editor.commands.undo}
      onWorkspaceChange={editor.commands.selectMode}
      exportUrl={exporting.url()}
      onExport={exportDocument}
      onAtlasExport={exportAtlas}
      onStudioOpen={workspace === undefined ? undefined : () => workspace.openRuntime('studio')}
      onViewerOpen={workspace === undefined ? undefined : () => workspace.openRuntime('viewer')}
      onRecoveryOpen={props.recovery === undefined ? undefined : openRecovery}
      onExampleOpen={imports.handleOpenExample}
      onFileImport={imports.handleImport}
      onPsdReimport={imports.reimport.load}
      onFileOpen={imports.handleOpen}
    />
  )
  return (
    <>
      <PuppetEditor
        model={props.model}
        active={props.active}
        initialMotionId={props.initialMotionId}
        initialWorkspace={props.initialWorkspace}
        onControl={handleControl}
        header={renderHeader}
      />
      <FileLoadingDialog fileName={imports.pendingFile()} onCancel={imports.cancel} />
      <PsdReimportDialog controller={imports.reimport} />
      <Show when={recoveryOpen() && props.recovery}>
        {(recovery) => (
          <DocumentRecoveryDialog
            recovery={recovery()}
            revision={props.model.revision}
            onRestore={(document) => replace(document, '자동 저장 작업 복구')}
            onClose={() => setRecoveryOpen(false)}
            onReturnFocus={() => returnFocus?.()}
          />
        )}
      </Show>
      <EditorToast
        message={
          notice() ??
          (exporting.omitsTemporary() ? '임시 변경은 JSON에 포함되지 않았습니다.' : undefined)
        }
        onDismiss={() => {
          setNotice(null)
          exporting.dismissNotice()
        }}
      />
    </>
  )
}
