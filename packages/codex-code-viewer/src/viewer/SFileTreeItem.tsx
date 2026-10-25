import {useTranslations} from './locale/use-translations'
import {Show} from 'solid-js'
import {SFileIcon} from './SFileIcon'
import {SIcon} from './SIcon'
import type {useFileTree} from './use-file-tree'

interface SFileTreeItemProps {
  readonly onActivate: (event: MouseEvent) => void
  readonly onContextMenu: (event: MouseEvent) => void
  readonly onKeyboard: (event: KeyboardEvent) => void
  readonly spacingBefore?: number
  readonly path: string
  readonly cutPath?: string
  readonly tree: ReturnType<typeof useFileTree>
}
const INDENT_WIDTH = 16

export const SFileTreeItem = (props: SFileTreeItemProps) => {
  const t = useTranslations()
  const openable = (): boolean => {
    const node = props.tree.node(props.path)
    return node?.kind === 'directory' || node?.openable === true
  }
  const change = () => {
    const node = props.tree.node(props.path)
    return node?.kind === 'file' ? node.change : undefined
  }
  const description = (): string | undefined => {
    switch (change()) {
      case 'added':
        return t('추가된 파일')
      case 'modified':
        return t('수정된 파일')
      case 'deleted':
        return t('삭제된 파일 · 변경 사항 보기')
      case undefined:
        return undefined
    }
  }
  return (
    <>
      <div
        aria-hidden="true"
        class="h-[var(--tree-space)]"
        style={{'--tree-space': `${props.spacingBefore ?? 0}px`}}
      />
      <button
        aria-label={props.tree.node(props.path)?.name}
        aria-description={description()}
        aria-disabled={!openable()}
        aria-expanded={
          props.tree.node(props.path)?.kind === 'directory'
            ? props.tree.isExpanded(props.path)
            : undefined
        }
        aria-level={props.path.split('/').length}
        aria-posinset={props.tree.position(props.path)?.position}
        aria-setsize={props.tree.position(props.path)?.size}
        aria-selected={
          props.tree.node(props.path)?.kind === 'file'
            ? props.path === props.tree.currentPath()
            : undefined
        }
        class="ui-transition relative flex h-7 w-full items-center gap-2 rounded-row pr-2 text-left
                    [padding-left:calc(var(--tree-indent)+8px)]
                  hover:bg-hover aria-selected:bg-hover aria-disabled:cursor-default aria-disabled:text-muted
                    focus-visible:bg-hover focus-visible:outline-none"
        data-tree-path={props.path}
        classList={{
          'opacity-50':
            props.cutPath !== undefined &&
            (props.path === props.cutPath || props.path.startsWith(`${props.cutPath}/`)),
        }}
        onClick={(event) => props.onActivate(event)}
        onFocus={() => props.tree.focus(props.path)}
        onContextMenu={(event) => props.onContextMenu(event)}
        onKeyDown={(event) => props.onKeyboard(event)}
        role="treeitem"
        style={{'--tree-indent': `${(props.path.split('/').length - 1) * INDENT_WIDTH}px`}}
        tabindex={props.tree.activePath() === props.path ? 0 : -1}
        title={
          openable() ? props.path : t('{path} · 아직 지원하지 않는 파일 형식', {path: props.path})
        }
        type="button"
      >
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 left-2 w-[var(--tree-indent)]
                  tree-guides"
        />
        <Show
          when={props.tree.node(props.path)?.kind === 'directory'}
          fallback={<SFileIcon path={props.path} />}
        >
          <span
            class="flex h-4 w-4 shrink-0 items-center justify-center text-muted"
            classList={{'rotate-90': props.tree.isExpanded(props.path)}}
          >
            <SIcon name="forward" />
          </span>
        </Show>
        <span
          class="min-w-0 flex-1 truncate"
          classList={{
            'decoration-change-added': change() === 'added',
            'decoration-change-deleted text-muted': change() === 'deleted',
            'decoration-change-modified': change() === 'modified',
            'underline decoration-2 underline-offset-4': change() !== undefined,
          }}
        >
          {props.tree.node(props.path)?.name}
        </span>
      </button>
    </>
  )
}
