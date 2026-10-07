import {createSignal, For, onCleanup, onMount, Show, untrack} from 'solid-js'
import type {CodeLocation} from '../shared/contracts'
import {SCodeDocument} from './SCodeDocument'
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

interface SCodeViewerProps {
  port: ViewerPort
}
export const SCodeViewer = (props: SCodeViewerProps) => {
  const port = untrack(() => props.port)
  const viewer = useViewer(port)
  const [focusRequest, setFocusRequest] = createSignal(0)
  const [treeVisible, setTreeVisible] = createSignal(false)
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const search = useDocumentSearch({source: () => viewer.session()?.document.source ?? ''})
  const handleFind = (text?: string): void => {
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
  const handleOpen = async (location: CodeLocation): Promise<void> => {
    if (!location.path.startsWith('/')) {
      await viewer.go(location)
      return
    }
    const opened = await viewer.open(location.path)
    const current = viewer.session()
    if (opened && current !== null && (location.line !== 1 || location.column !== 1)) {
      await viewer.go({...location, path: current.document.location.path})
    }
  }
  const handleChoice = (location: CodeLocation): void => {
    viewer.go(location)
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
    <main
      class="h-screen min-h-0 flex flex-col bg-canvas font-sans text-foreground"
      ref={setElement}
    >
      <SViewerToolbar
        viewer={viewer}
        onOpen={handleOpen}
        focusRequest={focusRequest()}
        treeVisible={treeVisible()}
        onToggleTree={() => setTreeVisible((previous) => !previous)}
      />
      <Show when={search.visible()}>
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
      <div class="flex min-h-0 flex-1">
        <section aria-label="파일 내용" class="flex min-h-0 min-w-0 flex-1 flex-col">
          <Show when={viewer.session()}>
            {(session) => (
              <>
                <Show when={viewer.choices().length > 0}>
                  <nav
                    aria-label="정의 선택"
                    class="flex flex-wrap gap-2 border-b border-divider p-3"
                  >
                    <For each={viewer.choices()}>
                      {(location) => (
                        <button
                          class="ui-button"
                          onClick={() => handleChoice(location)}
                          type="button"
                        >
                          {location.path}:{location.line}
                        </button>
                      )}
                    </For>
                  </nav>
                </Show>
                <SCodeDocument
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
              </>
            )}
          </Show>
        </section>
        <SFileTree
          port={port}
          session={viewer.session() ?? undefined}
          visible={treeVisible()}
          onOpen={handleChoice}
          onError={viewer.reportError}
        />
      </div>
      <footer class="mt-auto flex shrink-0 items-center gap-3 border-t border-divider px-4 py-1">
        <span class="min-w-0 flex-1 break-all text-sm text-muted">{viewer.address()}</span>
        <button
          aria-label="채팅창에 추가"
          class="ui-button shrink-0 py-1"
          disabled={viewer.session() === null}
          onClick={() => viewer.share()}
          title="선택한 파일과 줄 정보를 다음 채팅 메시지에 추가"
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
  )
}
