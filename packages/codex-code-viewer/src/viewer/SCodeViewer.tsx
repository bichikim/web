import {createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'
import {SDefinitionChoices} from './SDefinitionChoices'
import {SFileDocument} from './SFileDocument'
import type {ViewerPort} from './types'
import {useViewer} from './use-viewer'
import {SIcon} from './SIcon'
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
import {SWorkspacePrompt} from './SWorkspacePrompt'
import {useFileTreeVisibility} from './use-file-tree-visibility'

interface SCodeViewerProps {
  port: ViewerPort
}
export const SCodeViewer = (props: SCodeViewerProps) => {
  const port = untrack(() => props.port)
  const viewer = useViewer(port)
  const mediaCache = useMediaCache(() => viewer.session()?.session ?? null)
  const [focusRequest, setFocusRequest] = createSignal(0)
  const tree = useFileTreeVisibility(viewer.workspaceSession)
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const search = useDocumentSearch({source: () => viewer.session()?.document.source ?? ''})
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
      ?.querySelector<HTMLButtonElement>('[data-line-number][tabindex="0"]')
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
              />
            }
          >
            <section aria-label="파일 내용" class="flex min-h-0 min-w-0 flex-1 flex-col">
              <Show
                when={viewer.session()}
                fallback={<SWorkspacePrompt workspace={viewer.workspaceSession()?.workspace} />}
              >
                {(session) => (
                  <>
                    <SDefinitionChoices locations={viewer.choices()} onOpen={viewer.openLocation} />
                    <Show when={viewer.viewState.fileKey()} keyed>
                      {(_key) => (
                        <SFileDocument
                          port={port}
                          session={session().session}
                          searchVisible={search.visible()}
                          onPreview={search.close}
                          onOpen={viewer.openLocation}
                          onError={viewer.reportError}
                          document={session().document}
                          onFollow={viewer.follow}
                          onSelect={viewer.selectLines}
                          onSelectText={viewer.selectText}
                          selection={viewer.selection() ?? undefined}
                          matches={search.matches()}
                          activeMatch={search.active()}
                          searchScrollRequest={search.scrollRequest()}
                          onCopy={viewer.copy}
                          onShare={viewer.share}
                          onFind={handleFind}
                        />
                      )}
                    </Show>
                  </>
                )}
              </Show>
            </section>
          </SResizablePanels>
          <footer class="mt-auto flex shrink-0 items-center gap-3 border-t border-divider px-4 py-1">
            <span class="min-w-0 flex-1 break-all text-sm text-muted">{viewer.address()}</span>
            <button
              aria-label="채팅창에 추가"
              class="ui-button shrink-0 py-1"
              disabled={viewer.session() === null}
              onClick={() => viewer.share()}
              title={
                viewer.session()?.document.media === undefined
                  ? '선택한 파일과 줄 정보를 다음 채팅 메시지에 추가'
                  : '파일 전체를 다음 채팅 메시지에 추가'
              }
              type="button"
            >
              <SIcon name="add" />
              채팅창에 추가
            </button>
          </footer>
          <Show when={viewer.notice()} keyed>
            {(notice) => <SNotice message={notice.message} onDismiss={viewer.dismissNotice} />}
          </Show>
        </main>
      </ViewStateContext.Provider>
    </MediaCacheContext.Provider>
  )
}
