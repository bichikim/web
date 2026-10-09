import {createSignal, For, Show, untrack} from 'solid-js'
import type {CodeLocation, ViewerConnection} from '../shared/contracts'
import {SFileIcon} from './SFileIcon'
import {SIcon} from './SIcon'
import type {ViewerPort, WorkspaceSelection} from './types'
import {useFileTree} from './use-file-tree'
import {useTreeContextMenu} from './use-tree-context-menu'
import {SFileTreeContextMenu} from './SFileTreeContextMenu'
import {useTreeSelectionScroll} from './use-tree-selection-scroll'

interface SFileTreeProps {
  port: ViewerPort
  session?: ViewerConnection
  visible?: boolean
  onOpen?: (location: CodeLocation) => void
  onError?: (error: unknown) => void
  onShare?: (selection: WorkspaceSelection) => void
  onCopy?: (path: string) => void
}
const INDENT_WIDTH = 16

export const SFileTree = (props: SFileTreeProps) => {
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const tree = useFileTree({
    onError: (error) => props.onError?.(error),
    onOpen: (location) => props.onOpen?.(location),
    port: untrack(() => props.port),
    session: () => props.session ?? null,
    visible: () => props.visible === true,
  })
  const menu = useTreeContextMenu({
    node: tree.node,
    onFocus: tree.focus,
    session: () => props.session ?? null,
    visible: () => props.visible === true,
  })
  useTreeSelectionScroll({element, path: tree.currentPath, paths: tree.paths})
  const handleKeyboard = (event: KeyboardEvent, path: string): void => {
    if (menu.handleKeyboard(event, path)) {
      return
    }
    if (tree.navigate(path, event.key)) {
      event.preventDefault()
      const buttons = element()?.querySelectorAll<HTMLButtonElement>('[role="treeitem"]') ?? []
      Array.from(buttons)
        .find((button) => button.dataset.treePath === tree.activePath())
        ?.focus()
    }
  }
  const openable = (path: string): boolean => {
    const node = tree.node(path)
    return node?.kind === 'directory' || node?.openable === true
  }
  return (
    <Show when={props.visible}>
      <aside
        aria-label="파일 트리"
        id="workspace-files"
        class="flex h-full min-h-0 w-full min-w-0 flex-col bg-canvas pt-1 text-sm"
        ref={setElement}
      >
        <Show when={props.session}>
          {(session) => (
            <p class="m-0 truncate px-4 py-2 font-medium" title={session().workspace}>
              {session().workspace.split('/').filter(Boolean).at(-1) ?? session().workspace}
            </p>
          )}
        </Show>
        <label class="ui-field mx-2 mb-2 gap-2 rounded-control px-2 text-muted">
          <SIcon name="search" />
          <input
            aria-label="파일 필터링"
            class="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            onInput={(event) => tree.change(event.currentTarget.value)}
            placeholder="파일 필터링…"
            value={tree.query()}
          />
        </label>
        <div
          aria-label="프로젝트 파일"
          aria-busy={tree.pending()}
          class="min-h-0 flex-1 overflow-auto px-2 pb-2"
          role="tree"
        >
          <For each={tree.paths()}>
            {(path) => (
              <button
                aria-label={tree.node(path)?.name}
                aria-disabled={!openable(path)}
                aria-expanded={
                  tree.node(path)?.kind === 'directory' ? tree.isExpanded(path) : undefined
                }
                aria-level={path.split('/').length}
                aria-selected={
                  tree.node(path)?.kind === 'file' ? path === tree.currentPath() : undefined
                }
                class="ui-transition relative flex h-7 w-full items-center gap-2 rounded-row pr-2 text-left
                    [padding-left:calc(var(--tree-indent)+8px)]
                  hover:bg-hover aria-selected:bg-hover aria-disabled:cursor-default aria-disabled:text-muted
                    focus-visible:bg-hover focus-visible:outline-none"
                data-tree-path={path}
                onClick={() => {
                  tree.focus(path)
                  tree.activate(path)
                }}
                onFocus={() => tree.focus(path)}
                onContextMenu={(event) => menu.handleContextMenu(event, path)}
                onKeyDown={(event) => handleKeyboard(event, path)}
                role="treeitem"
                style={{'--tree-indent': `${(path.split('/').length - 1) * INDENT_WIDTH}px`}}
                tabindex={tree.activePath() === path ? 0 : -1}
                title={openable(path) ? path : `${path} · 아직 지원하지 않는 파일 형식`}
                type="button"
              >
                <span
                  aria-hidden="true"
                  class="pointer-events-none absolute inset-y-0 left-2 w-[var(--tree-indent)]
                  tree-guides"
                />
                <Show
                  when={tree.node(path)?.kind === 'directory'}
                  fallback={<SFileIcon path={path} />}
                >
                  <span
                    class="flex h-4 w-4 shrink-0 items-center justify-center text-muted"
                    classList={{'rotate-90': tree.isExpanded(path)}}
                  >
                    <SIcon name="forward" />
                  </span>
                </Show>
                <span class="min-w-0 flex-1 truncate">{tree.node(path)?.name}</span>
              </button>
            )}
          </For>
          <Show when={tree.paths().length === 0}>
            <p class="m-0 px-2 py-3 text-muted" role="status">
              {tree.pending() ? '파일 목록을 불러오는 중…' : '표시할 파일이 없습니다.'}
            </p>
          </Show>
        </div>
        <Show when={tree.truncated()}>
          <p class="m-0 border-t border-divider p-2 text-xs text-muted" role="status">
            파일 10,000개까지 표시합니다.
          </p>
        </Show>
        <Show when={menu.context()} keyed>
          {(context) => (
            <SFileTreeContextMenu
              x={context.x}
              y={context.y}
              selection={context.selection}
              onShare={props.onShare}
              onCopy={props.onCopy}
              onClose={menu.close}
            />
          )}
        </Show>
      </aside>
    </Show>
  )
}
