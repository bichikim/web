import {createSignal, For, Show, untrack} from 'solid-js'
import type {CodeLocation, ViewerConnection, WorkspaceEntry} from '../shared/contracts'
import {SFileTreeItem} from './SFileTreeItem'
import {SFileTreeFilter} from './SFileTreeFilter'
import type {FileMutation, ViewerPort, WorkspaceSelection} from './types'
import {useFileTree} from './use-file-tree'
import {useTreeFileActions} from './use-tree-file-actions'
import {SFileTreeActions} from './SFileTreeActions'
import {useTreeSelectionScroll} from './use-tree-selection-scroll'
import {useVirtualTree} from './use-virtual-tree'
import {SFileTreeToolbar} from './SFileTreeToolbar'

interface SFileTreeProps {
  port: ViewerPort
  session?: ViewerConnection
  visible?: boolean
  onOpen?: (location: CodeLocation) => void
  onError?: (error: unknown) => void
  onShare?: (selection: WorkspaceSelection) => void
  onCopy?: (path: string) => void
  onMutation?: (change: FileMutation) => Promise<void>
  pendingPaths?: readonly string[]
  saving?: boolean
  revision?: number
}

const focusTreeItem = (element: HTMLElement | null, path: string | null): void => {
  const buttons = element?.querySelectorAll<HTMLButtonElement>('[role="treeitem"]') ?? []
  Array.from(buttons)
    .find((button) => button.dataset.treePath === path)
    ?.focus()
}

interface TreeFocusOptions {
  readonly element: HTMLElement | null
  readonly path: string | null
  readonly reveal: (path: string | null) => void
}
const focusTreeDestination = (options: TreeFocusOptions): void => {
  options.reveal(options.path)
  focusTreeItem(options.element, options.path)
  queueMicrotask(() => focusTreeItem(options.element, options.path))
}

export const SFileTree = (props: SFileTreeProps) => {
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const [viewportElement, setViewportElement] = createSignal<HTMLElement | null>(null)
  const tree = useFileTree({
    onError: (error) => props.onError?.(error),
    onOpen: (location) => props.onOpen?.(location),
    port: untrack(() => props.port),
    revision: () => props.revision ?? 0,
    session: () => props.session ?? null,
    visible: () => props.visible === true,
  })
  const handleMutation = async (change: FileMutation): Promise<void> => {
    const session = props.session?.session
    await props.onMutation?.(change)
    if (props.session?.session !== session) {
      return
    }
    await tree.reload()
    if (props.session?.session !== session) {
      return
    }
    if (change.action !== 'delete') {
      tree.reveal(change.entry.path)
    }
  }
  const actions = useTreeFileActions({
    onChanged: handleMutation,
    pendingPaths: () => props.pendingPaths ?? [],
    port: untrack(() => props.port),
    saving: () => props.saving === true,
    session: () => props.session ?? null,
    tree,
    visible: () => props.visible === true,
  })
  const viewport = useVirtualTree({
    active: tree.activePath,
    current: tree.currentPath,
    element: viewportElement,
    paths: tree.paths,
  })
  const revealSelection = useTreeSelectionScroll({
    element,
    path: tree.currentPath,
    paths: tree.paths,
  })
  const handleFocus = (path: string | null): void =>
    focusTreeDestination({element: element(), path, reveal: viewport.reveal})
  const handleReveal = (): void => {
    tree.reveal()
    viewport.reveal(tree.currentPath())
    revealSelection()
  }
  const creationParent = (): string => {
    const path = tree.activePath() ?? ''
    return tree.node(path)?.kind === 'directory' ? path : path.split('/').slice(0, -1).join('/')
  }
  const handleCreated = async (entry: WorkspaceEntry): Promise<void> => {
    const session = props.session?.session
    await tree.reload()
    if (props.session?.session !== session || !props.visible) {
      return
    }
    tree.reveal(entry.path)
    handleFocus(entry.path)
    const node = tree.node(entry.path)
    if (node?.kind === 'file' && node.openable) {
      props.onOpen?.({column: 1, line: 1, path: entry.path})
    }
  }
  const handleKeyboard = (event: KeyboardEvent, path: string): void => {
    if (actions.keyboard(event, path)) {
      return
    }
    if (tree.navigate(path, event.key)) {
      event.preventDefault()
      handleFocus(tree.activePath())
    }
  }
  return (
    <Show when={props.visible}>
      <aside
        aria-label="파일 트리"
        id="workspace-files"
        class="flex h-full min-h-0 w-full min-w-0 flex-col bg-canvas pt-1 text-sm"
        ref={setElement}
      >
        <SFileTreeToolbar
          canReveal={tree.canReveal()}
          onCreated={handleCreated}
          onReveal={handleReveal}
          onRefresh={tree.reload}
          refreshing={tree.pending()}
          parent={creationParent()}
          port={props.port}
          session={props.session}
          visible={props.visible === true}
        />
        <SFileTreeFilter query={tree.query()} onChange={tree.change} />
        <div
          aria-label="프로젝트 파일"
          aria-busy={tree.pending()}
          class="min-h-0 flex-1 overflow-auto px-2 pb-2"
          role="tree"
          onContextMenu={actions.handleBackground}
          onScroll={viewport.scroll}
          ref={setViewportElement}
        >
          <For each={viewport.paths()}>
            {(path) => (
              <SFileTreeItem
                path={path}
                spacingBefore={viewport.gap(path)}
                tree={tree}
                onContextMenu={(event) => actions.handleContextMenu(event, path)}
                cutPath={actions.cutPath()}
                onKeyboard={(event) => handleKeyboard(event, path)}
              />
            )}
          </For>
          <div
            aria-hidden="true"
            class="h-[var(--tree-space)]"
            style={{'--tree-space': `${viewport.bottom()}px`}}
          />
          <Show when={tree.paths().length === 0}>
            <p class="m-0 px-2 py-3 text-muted" role="status">
              {tree.pending() ? '파일 목록을 불러오는 중…' : '표시할 파일이 없습니다.'}
            </p>
          </Show>
        </div>
        <Show when={tree.incomplete()}>
          <p class="m-0 border-t border-divider p-2 text-xs text-muted" role="status">
            일부 폴더를 읽지 못했습니다. 새로고침하여 다시 탐색해 주세요.
          </p>
        </Show>
        <SFileTreeActions
          actions={actions}
          workspace={props.session?.workspace}
          onCopy={props.onCopy}
          onShare={props.onShare}
          onClose={() => handleFocus(tree.activePath())}
        />
      </aside>
    </Show>
  )
}
