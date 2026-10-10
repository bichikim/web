import {SViewerDocument} from './SViewerDocument'
import {createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'
import type {ViewerPort} from './types'
import {useViewer} from './use-viewer'
import {SNotice} from './SNotice'
import {useViewerShortcuts} from './use-viewer-shortcuts'
import {useDocumentSearch} from './use-document-search'
import {SFindBar} from './SFindBar'
import {readCodeText} from './read-code-text'
import {SFileTree} from './SFileTree'
import {SViewerToolbar} from './SViewerToolbar'
import {SResizablePanels} from './SResizablePanels'
import {useMediaCache} from './use-media-cache'
import {MediaCacheContext} from './media-cache-context'
import {ViewStateContext} from './view-state/context'
import {hasDocumentSource} from '../shared/has-document-source'
import {useFileTreeVisibility} from './use-file-tree-visibility'
import {SViewerSettings} from './SViewerSettings'
import {useViewerSettings} from './use-viewer-settings'
import {SUnsavedChanges} from './editor/SUnsavedChanges'

interface SCodeViewerProps {
  port: ViewerPort
}
export const SCodeViewer = (props: SCodeViewerProps) => {
  const port = untrack(() => props.port)
  const viewer = useViewer(port)
  const settings = useViewerSettings()
  const [settingsOpen, setSettingsOpen] = createSignal(false)
  const mediaCache = useMediaCache(() => viewer.session()?.session ?? null)
  const [focusRequest, setFocusRequest] = createSignal(0)
  const tree = useFileTreeVisibility(viewer.workspaceSession)
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const search = useDocumentSearch({source: viewer.editing.source})
  const sourceAvailable = (): boolean => {
    const document = viewer.session()?.document
    return document === undefined || hasDocumentSource(document)
  }
  const handleFind = (text?: string): void => {
    if (!sourceAvailable()) {
      return
    }
    const container = element()?.querySelector<HTMLElement>('[aria-label="소스 코드"]')
    search.open(
      text ??
        (container === null || container === undefined
          ? undefined
          : (readCodeText(container) ?? undefined)),
    )
  }
  const handleCloseSearch = (): void => {
    search.close()
    element()
      ?.querySelector<HTMLElement>('[aria-label="코드 편집기"], [data-line-number][tabindex="0"]')
      ?.focus({preventScroll: true})
  }
  useViewerShortcuts({
    onDismiss: () => {
      if (search.visible()) {
        handleCloseSearch()
      } else {
        viewer.dismissNotice()
      }
    },
    onFind: handleFind,
    onMove: viewer.move,
    onSave: () => viewer.editing.save(),
    onSearch: () => setFocusRequest((previous) => previous + 1),
  })
  onMount(() => {
    window.addEventListener('focus', viewer.refresh)
    onCleanup(() => window.removeEventListener('focus', viewer.refresh))
  })
  return (
    <MediaCacheContext.Provider value={mediaCache}>
      <ViewStateContext.Provider value={viewer.viewState}>
        <main
          class="h-screen min-h-0 flex flex-col bg-canvas font-sans text-foreground"
          ref={setElement}
        >
          <SViewerToolbar
            viewer={viewer}
            onOpen={viewer.openLocation}
            focusRequest={focusRequest()}
            treeVisible={tree.visible()}
            onToggleTree={tree.toggle}
            onSettings={() => setSettingsOpen(true)}
          />
          <Show when={search.visible() && sourceAvailable()}>
            <SFindBar
              query={search.query()}
              count={search.matches().length}
              active={search.active()}
              focusRequest={search.focusRequest()}
              onChange={search.change}
              onMove={search.move}
              onClose={handleCloseSearch}
            />
          </Show>
          <SResizablePanels
            visible={tree.visible()}
            controls="workspace-files"
            sidebar={
              <SFileTree
                port={port}
                session={viewer.workspaceSession() ?? undefined}
                visible={tree.visible()}
                onOpen={(location) => viewer.openLocation(location, {restoreView: true})}
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
              search={search}
              onFind={handleFind}
              previewLines={settings.previewLines()}
            />
          </SResizablePanels>
          <footer class="mt-auto flex shrink-0 items-center gap-3 border-t border-divider px-4 py-1">
            <span class="min-w-0 flex-1 truncate text-sm text-muted" title={viewer.address()}>
              {viewer.address()}
            </span>
            <Show when={viewer.workspaceSession()}>
              {(session) => (
                <span
                  aria-label="작업 폴더"
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
            open={settingsOpen()}
            previewLines={settings.previewLines()}
            onChange={settings.changePreviewLines}
            onClose={() => setSettingsOpen(false)}
          />
        </main>
      </ViewStateContext.Provider>
    </MediaCacheContext.Provider>
  )
}
