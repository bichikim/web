import {useWorkspaceDocuments} from './use-workspace-documents'
import {useTranslations} from './locale/use-translations'
import {SViewerDocument} from './SViewerDocument'
import {createSignal, Show, untrack} from 'solid-js'
import type {ViewerPort} from './types'
import {useViewer} from './use-viewer'
import {SNotice} from './SNotice'
import {SFindBar} from './SFindBar'
import {SFileTree} from './SFileTree'
import {SViewerToolbar} from './SViewerToolbar'
import {SResizablePanels} from './SResizablePanels'
import {useMediaCache} from './use-media-cache'
import {MediaCacheContext} from './media-cache-context'
import {ViewStateContext} from './view-state/context'
import {useFileTreeVisibility} from './use-file-tree-visibility'
import {SViewerSettings} from './SViewerSettings'
import {useViewerSettings} from './use-viewer-settings'
import {SUnsavedChanges} from './editor/SUnsavedChanges'
import {SContextAttachments} from './SContextAttachments'

interface SViewerWorkspaceProps {
  readonly embedded?: boolean
  settings: ReturnType<typeof useViewerSettings>
  port: ViewerPort
}
export const SViewerWorkspace = (props: SViewerWorkspaceProps) => {
  const t = useTranslations()
  const port = untrack(() => props.port)
  const viewer = useViewer(port)
  const [settingsOpen, setSettingsOpen] = createSignal(false)
  const mediaCache = useMediaCache(() => viewer.session()?.session ?? null)
  const [focusRequest, setFocusRequest] = createSignal(0)
  const tree = useFileTreeVisibility(
    viewer.workspaceSession,
    port.saveTreeState,
    viewer.reportError,
  )
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const documents = useWorkspaceDocuments({
    element,
    onSearch: () => setFocusRequest((previous) => previous + 1),
    port,
    viewer,
  })
  const navigation = {
    ...viewer,
    canBack: documents.canBack,
    canForward: documents.canForward,
    move: documents.moveFile,
    refresh: documents.refreshFile,
  }
  return (
    <MediaCacheContext.Provider value={mediaCache}>
      <ViewStateContext.Provider value={viewer.viewState}>
        <main
          class="h-screen flex flex-col bg-canvas font-sans text-foreground"
          classList={{'min-h-0': !props.embedded, 'min-h-120': props.embedded ?? false}}
          ref={setElement}
        >
          <SViewerToolbar
            viewer={navigation}
            onOpen={documents.openLocation}
            focusRequest={focusRequest()}
            treeVisible={tree.visible()}
            onToggleTree={tree.toggle}
            onSettings={() => setSettingsOpen(true)}
          />
          <Show when={documents.visible() && documents.sourceAvailable()}>
            <SFindBar
              query={documents.query()}
              count={documents.matches().length}
              active={documents.active()}
              focusRequest={documents.focusRequest()}
              onChange={documents.change}
              onMove={documents.move}
              onClose={documents.closeSearch}
            />
          </Show>
          <SResizablePanels
            visible={tree.visible()}
            controls="workspace-files"
            sidebar={
              <SFileTree
                documentPath={documents.deletedDocument()?.path}
                sources={viewer.editing.sources()}
                port={port}
                session={viewer.workspaceSession() ?? undefined}
                visible={tree.visible()}
                onOpen={(location) => documents.openLocation(location, {restoreView: true})}
                onDeleted={documents.openDeleted}
                onError={viewer.reportError}
                onShare={viewer.sharePath}
                onCopy={viewer.copyPath}
                onMutation={viewer.fileMutation}
                pendingPaths={viewer.editing.pendingFiles()}
                saving={viewer.editing.saving()}
                revision={viewer.workspaceRevision()}
              />
            }
          >
            <SViewerDocument
              port={port}
              viewer={viewer}
              deletedDocument={documents.deletedDocument()}
              deletedPending={documents.deletedPending()}
              deletedSource={documents.deletedSource()}
              deletedSaving={documents.deletedSaving()}
              deletedEditing={documents.deletedEditing()}
              onToggleDeletedEditing={documents.toggleDeletedEditing}
              onChangeDeleted={
                documents.deletedEditable() ? documents.changeDeletedSource : undefined
              }
              onSaveDeleted={documents.deletedEditable() ? documents.saveDeleted : undefined}
              onCloseDeleted={documents.closeDeleted}
              search={documents}
              onFind={documents.findText}
              previewLines={props.settings.previewLines()}
            />
          </SResizablePanels>
          <SContextAttachments port={port} onError={viewer.reportError} onNotice={viewer.notify} />
          <footer class="mt-auto flex shrink-0 items-center gap-3 border-t border-divider px-4 py-1">
            <span class="min-w-0 flex-1 truncate text-sm text-muted" title={documents.address()}>
              {documents.address()}
            </span>
            <Show when={viewer.workspaceSession()}>
              {(session) => (
                <span
                  aria-label={t('작업 폴더')}
                  class="max-w-1/2 min-w-0 truncate text-sm text-muted"
                  title={session().workspace}
                >
                  {session().workspace.split(/[/\\]/u).filter(Boolean).at(-1) ??
                    session().workspace}
                </span>
              )}
            </Show>
          </footer>
          <Show when={viewer.notice()} keyed>
            {(notice) => <SNotice message={notice.message} onDismiss={viewer.dismissNotice} />}
          </Show>
          <SUnsavedChanges editing={viewer.editing} />
          <SViewerSettings
            port={port}
            workspace={viewer.workspaceSession()?.workspace}
            onWorkspaceChange={viewer.changeWorkspace}
            open={settingsOpen()}
            previewLines={props.settings.previewLines()}
            language={props.settings.preference()}
            onLanguageChange={props.settings.changeLanguage}
            onChange={props.settings.changePreviewLines}
            onClose={() => setSettingsOpen(false)}
          />
        </main>
      </ViewStateContext.Provider>
    </MediaCacheContext.Provider>
  )
}
