import {type Accessor, batch, createEffect, createMemo, createSignal, on, untrack} from 'solid-js'
import {
  type CodeLocation,
  treeSchema,
  type ViewerConnection,
  type WorkspaceFile,
  type WorkspaceTree,
} from '../shared/contracts'
import {callViewerTool} from './call-viewer-tool'
import {buildFileTree, getTreeDestination, getVisibleNodes} from './file-tree'
import {createRefreshQueue} from './create-refresh-queue'
import {useLatestRequest} from './use-latest-request'
import type {ViewerPort} from './types'

interface UseFileTreeProps {
  onError: (error: unknown) => void
  onOpen: (location: CodeLocation) => void
  port: ViewerPort
  session: Accessor<ViewerConnection | null>
  visible: Accessor<boolean>
  revision?: Accessor<number>
}

const parents = (path: string): string[] =>
  path
    .split('/')
    .slice(0, -1)
    .map((_part, index, parts) => parts.slice(0, index + 1).join('/'))

const documentPath = (session: ViewerConnection | null): string =>
  session !== null && 'document' in session ? session.document.location.path : ''

const containsPath = (files: readonly WorkspaceFile[], path: string): boolean =>
  files.some((file) => file.path === path)

const toggleExpansion = (previous: Set<string>, path: string): Set<string> => {
  const next = new Set(previous)
  if (next.has(path)) {
    next.delete(path)
  } else {
    next.add(path)
  }
  return next
}

const visibleSelection = (props: {
  current: string
  focused: string | null
  paths: readonly string[]
}): string | null =>
  props.focused !== null && props.paths.includes(props.focused)
    ? props.focused
    : props.paths.includes(props.current)
      ? props.current
      : (props.paths[0] ?? null)

export const useFileTree = (props: UseFileTreeProps) => {
  const [listing, setListing] = createSignal<WorkspaceTree>({
    directories: [],
    files: [],
    truncated: false,
  })
  const files = () => listing().files
  const directories = () => listing().directories ?? []
  const [query, setQuery] = createSignal('')
  const [expanded, setExpanded] = createSignal(new Set<string>())
  const [collapsed, setCollapsed] = createSignal(new Set<string>())
  const [focused, setFocused] = createSignal<string | null>(null)
  const request = useLatestRequest(props.onError)
  const sessionId = createMemo(() => props.session()?.session)
  const currentPath = () => documentPath(props.session())
  const filtered = createMemo(() => {
    const value = query().trim().toLowerCase()
    return buildFileTree(
      files().filter((file) => file.path.toLowerCase().includes(value)),
      directories().filter((path) => path.toLowerCase().includes(value)),
    )
  })
  const isExpanded = (path: string): boolean =>
    query().trim() === '' ? expanded().has(path) : !collapsed().has(path)
  const nodes = createMemo(() => getVisibleNodes(filtered(), isExpanded))
  const paths = createMemo(() => nodes().map((node) => node.path))
  const lookup = createMemo(() => new Map(nodes().map((node) => [node.path, node])))
  const activePath = createMemo(() =>
    visibleSelection({current: currentPath(), focused: focused(), paths: paths()}),
  )
  const loader = createMemo(() => {
    const session = sessionId()
    return createRefreshQueue(async (): Promise<void> => {
      const current = props.session()
      if (current === null || current.session !== session) {
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
        setListing(result)
      }
    })
  })
  const reload = (): Promise<void> => loader()()
  createEffect(
    on(sessionId, () => {
      request.cancel()
      batch(() => {
        setListing({directories: [], files: [], truncated: false})
        setQuery('')
        setExpanded(new Set(parents(untrack(currentPath))))
        setCollapsed(new Set<string>())
        setFocused(null)
      })
    }),
  )
  createEffect(
    on([props.visible, sessionId, () => props.revision?.() ?? 0], ([visible]) => {
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
    const change = (previous: Set<string>): Set<string> => toggleExpansion(previous, path)
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
  const reveal = (path = currentPath()): void => {
    if (!containsPath(files(), path) && !directories().includes(path)) {
      return
    }
    batch(() => {
      change('')
      setExpanded((previous) => new Set([...previous, ...parents(path)]))
      setFocused(path)
    })
  }
  return {
    activate,
    activePath,
    canReveal: createMemo(() => containsPath(files(), currentPath())),
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
    reveal,
    truncated: () => listing().truncated,
  }
}
