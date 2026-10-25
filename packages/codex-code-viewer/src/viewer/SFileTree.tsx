import {createTreeEntryHandler} from './create-tree-entry-handler'
import {useTreeChanges} from './use-tree-changes'
import {createTreeMutationHandler} from './create-tree-mutation-handler'
import {useTranslations} from './locale/use-translations'
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
import type {ChangedFile} from '../shared/change-contracts'

interface SFileTreeProps {
  documentPath?: string
  sources?: readonly import('../shared/contracts').CodeSource[]
  changes?: readonly ChangedFile[]
  changesAvailable?: boolean
  changeBase?: string
  onDeleted?: (path: string) => void
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

const creationParentOf = (tree: ReturnType<typeof useFileTree>): string => {
  const path = tree.activePath() ?? ''
  return tree.node(path)?.kind === 'directory' ? path : path.split('/').slice(0, -1).join('/')
}

export const SFileTree = (props: SFileTreeProps) => {
  const t = useTranslations()
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const [viewportElement, setViewportElement] = createSignal<HTMLElement | null>(null)
  const options = {
    documentPath: () => props.documentPath,
    onError: (error: unknown) => props.onError?.(error),
    port: untrack(() => props.port),
    revision: () => props.revision ?? 0,
    session: () => props.session ?? null,
    visible: () => props.visible === true,
  }
  const changes = useTreeChanges({
    ...options,
    available: () => props.changesAvailable,
    base: () => props.changeBase,
    files: () => props.changes,
    get onDeleted() {
      return props.onDeleted
    },
    onOpen: (location) => props.onOpen?.(location),
    sources: () => props.sources ?? [],
  })
  const tree = useFileTree({
    ...options,
    changedOnly: changes.changedOnly,
    changes: changes.files,
    onOpen: changes.open,
  })
  const actions = useTreeFileActions({
    ...options,
    onChanged: createTreeMutationHandler({
      onMutation: (change) => props.onMutation?.(change) ?? Promise.resolve(),
      session: () => props.session?.session,
      tree,
    }),
    pendingPaths: () => props.pendingPaths ?? [],
    saving: () => props.saving === true,
    tree,
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
  const handleCreated = createTreeEntryHandler({
    onFocus: handleFocus,
    onOpen: (location) => props.onOpen?.(location),
    session: () => props.session?.session,
    tree,
    visible: () => props.visible === true,
  })
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
        aria-label={t('파일 트리')}
        id="workspace-files"
        class="flex h-full min-h-0 w-full min-w-0 flex-col bg-canvas pt-1 text-sm"
        ref={setElement}
      >
        <SFileTreeToolbar
          changedOnly={changes.changedOnly()}
          changesAvailable={changes.available()}
          changeBase={changes.base() ?? undefined}
          onToggleChanges={changes.toggle}
          canReveal={tree.canReveal()}
          onCreated={handleCreated}
          onReveal={handleReveal}
          onRefresh={tree.reload}
          refreshing={tree.pending()}
          parent={creationParentOf(tree)}
          port={props.port}
          session={props.session}
          visible={props.visible === true}
        />
        <SFileTreeFilter query={tree.query()} onChange={tree.change} />
        <div
          aria-label={t('프로젝트 파일')}
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
                onActivate={(event) => actions.activate(event, path)}
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
              {tree.pending() ? t('파일 목록을 불러오는 중…') : t('표시할 파일이 없습니다.')}
            </p>
          </Show>
        </div>
        <Show when={tree.incomplete()}>
          <p class="m-0 border-t border-divider p-2 text-xs text-muted" role="status">
            {t('일부 폴더를 읽지 못했습니다. 새로고침하여 다시 탐색해 주세요.')}
          </p>
        </Show>
        <SFileTreeActions
          deletedPaths={changes.deletedPaths()}
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
