import {type Accessor, batch, createEffect, createMemo, createSignal, on, untrack} from 'solid-js'
import {
  type CodeLocation,
  treeSchema,
  type ViewerConnection,
  type WorkspaceFile,
} from '../shared/contracts'
import {callViewerTool} from './call-viewer-tool'
import {buildFileTree, getTreeDestination, getVisibleNodes} from './file-tree'
import {useLatestRequest} from './use-latest-request'
import type {ViewerPort} from './types'

interface UseFileTreeProps {
  onError: (error: unknown) => void
  onOpen: (location: CodeLocation) => void
  port: ViewerPort
  session: Accessor<ViewerConnection | null>
  visible: Accessor<boolean>
}

const parents = (path: string): string[] =>
  path
    .split('/')
    .slice(0, -1)
    .map((_part, index, parts) => parts.slice(0, index + 1).join('/'))

export const useFileTree = (props: UseFileTreeProps) => {
  const [files, setFiles] = createSignal<WorkspaceFile[]>([])
  const [truncated, setTruncated] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [expanded, setExpanded] = createSignal(new Set<string>())
  const [collapsed, setCollapsed] = createSignal(new Set<string>())
  const [focused, setFocused] = createSignal<string | null>(null)
  const request = useLatestRequest(props.onError)
  const sessionId = createMemo(() => props.session()?.session)
  const currentPath = () => {
    const session = props.session()
    return session !== null && 'document' in session ? session.document.location.path : ''
  }
  const filtered = createMemo(() => {
    const value = query().trim().toLowerCase()
    return buildFileTree(files().filter((file) => file.path.toLowerCase().includes(value)))
  })
  const isExpanded = (path: string): boolean =>
    query().trim() === '' ? expanded().has(path) : !collapsed().has(path)
  const nodes = createMemo(() => getVisibleNodes(filtered(), isExpanded))
  const paths = createMemo(() => nodes().map((node) => node.path))
  const lookup = createMemo(() => new Map(nodes().map((node) => [node.path, node])))
  const activePath = (): string | null => {
    const list = paths()
    const focus = focused()
    return focus !== null && list.includes(focus)
      ? focus
      : list.includes(currentPath())
        ? currentPath()
        : (list[0] ?? null)
  }
  const reload = async (): Promise<void> => {
    const current = props.session()
    if (current === null) {
      return
    }
    const result = await request.run(() =>
      callViewerTool({
        input: {session: current.session},
        name: 'code.tree',
        port: props.port,
        schema: treeSchema,
      }),
    )
    if (result !== null) {
      batch(() => {
        setFiles(result.files)
        setTruncated(result.truncated)
      })
    }
  }
  createEffect(
    on(sessionId, () => {
      request.cancel()
      batch(() => {
        setFiles([])
        setQuery('')
        setExpanded(new Set(parents(untrack(currentPath))))
        setCollapsed(new Set<string>())
        setFocused(null)
        setTruncated(false)
      })
    }),
  )
  createEffect(
    on([props.visible, sessionId], ([visible]) => {
      if (visible) {
        reload()
      }
    }),
  )
  createEffect(
    on(currentPath, (path) => {
      setExpanded((previous) => new Set([...previous, ...parents(path)]))
    }),
  )
  const toggle = (path: string): void => {
    const change = (previous: Set<string>): Set<string> => {
      const next = new Set(previous)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    }
    if (query().trim() === '') {
      setExpanded(change)
    } else {
      setCollapsed(change)
    }
    setFocused(path)
  }
  const activate = (path: string): void => {
    const node = lookup().get(path)
    if (node?.kind === 'directory') {
      toggle(path)
    } else if (node?.kind === 'file' && node.openable) {
      props.onOpen({column: 1, line: 1, path})
    }
  }
  const navigate = (path: string, key: string): boolean => {
    const destination = getTreeDestination({
      expanded: isExpanded(path),
      key,
      node: lookup().get(path),
      path,
      paths: paths(),
    })
    if (destination === null) {
      return false
    }
    switch (destination.action) {
      case 'focus':
        setFocused(destination.path)
        break
      case 'toggle':
        toggle(path)
        break
      case 'stay':
        break
    }
    return true
  }
  const change = (value: string): void => {
    batch(() => {
      setQuery(value)
      setCollapsed(new Set<string>())
      setFocused(null)
    })
  }
  return {
    activate,
    activePath,
    change,
    currentPath,
    focus: setFocused,
    isExpanded,
    navigate,
    node: (path: string) => lookup().get(path),
    paths,
    pending: request.pending,
    query,
    reload,
    truncated,
  }
}
