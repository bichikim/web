import {useTranslations} from './locale/use-translations'
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
    const container = element()?.querySelector<HTMLElement>('[data-code-source]')
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
      ?.querySelector<HTMLElement>(
        '[role="textbox"][aria-multiline="true"], [data-line-number][tabindex="0"]',
      )
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
          class="h-screen flex flex-col bg-canvas font-sans text-foreground"
          classList={{'min-h-0': !props.embedded, 'min-h-120': props.embedded ?? false}}
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
              previewLines={props.settings.previewLines()}
            />
          </SResizablePanels>
          <SContextAttachments port={port} onError={viewer.reportError} onNotice={viewer.notify} />
          <footer class="mt-auto flex shrink-0 items-center gap-3 border-t border-divider px-4 py-1">
            <span class="min-w-0 flex-1 truncate text-sm text-muted" title={viewer.address()}>
              {viewer.address()}
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
