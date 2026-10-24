import {type Accessor, batch, createEffect, createMemo, createSignal, on} from 'solid-js'
import {type CodeLocation, type ViewerConnection} from '../shared/contracts'
import {useTreeListing} from './use-tree-listing'
import {getTreePositions} from './file-tree/get-tree-positions'
import {getTreeDestination, getVisibleNodes} from './file-tree'
import type {ViewerPort} from './types'
import {createBoundedCache} from '../shared/create-bounded-cache'

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

const restoreExpansion = (
  session: ViewerConnection | null,
  local: ReadonlySet<string> | undefined,
): Set<string> => new Set(local ?? session?.treeState?.expanded ?? parents(documentPath(session)))

const visibleDirectories = (expanded: ReadonlySet<string>): string[] =>
  [
    '',
    ...[...expanded].filter((path) => parents(path).every((parent) => expanded.has(parent))),
  ].sort()

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
  const local = createBoundedCache<ReadonlySet<string>>({
    maxEntries: 16,
    maxWeight: 16,
    weight: () => 1,
  })
  const [query, setQuery] = createSignal('')
  const [expanded, setExpanded] = createSignal(new Set<string>())
  const [collapsed, setCollapsed] = createSignal(new Set<string>())
  const [focused, setFocused] = createSignal<string | null>(null)
  const sessionId = createMemo(() => props.session()?.session)
  const currentPath = () => documentPath(props.session())
  createEffect(
    on(sessionId, () => {
      const current = props.session()
      batch(() => {
        setQuery('')
        setExpanded(
          restoreExpansion(current, current === null ? undefined : local.get(current.workspace)),
        )
        setCollapsed(new Set<string>())
        setFocused(null)
      })
    }),
  )
  const scope = createMemo(() =>
    query().trim() === '' ? visibleDirectories(expanded()) : undefined,
  )
  const listing = useTreeListing({
    directories: scope,
    onError: props.onError,
    port: props.port,
    query,
    revision: () => (query().trim() === '' ? (props.revision?.() ?? 0) : 0),
    session: sessionId,
    visible: props.visible,
  })
  const isExpanded = (path: string): boolean =>
    query().trim() === '' ? expanded().has(path) : !collapsed().has(path)
  const nodes = createMemo(() => getVisibleNodes(listing.tree(), isExpanded))
  const paths = createMemo(() => nodes().map((node) => node.path))
  const lookup = createMemo(() => new Map(nodes().map((node) => [node.path, node])))
  const positions = createMemo(() => getTreePositions(paths()))
  const activePath = createMemo(() =>
    visibleSelection({current: currentPath(), focused: focused(), paths: paths()}),
  )
  const expand = (paths: readonly string[]): void => {
    const previous = expanded()
    if (paths.every((path) => previous.has(path))) {
      return
    }
    const next = new Set([...previous, ...paths])
    setExpanded(next)
    persist(next)
  }
  const persist = (paths: ReadonlySet<string>): void => {
    const current = props.session()
    if (current !== null) {
      local.set(current.workspace, paths)
      props.port.saveTreeState?.(current.session, {expanded: [...paths]}).catch(props.onError)
    }
  }
  createEffect(
    on([sessionId, currentPath], ([session, path], previous) => {
      if (previous !== undefined && previous[0] === session && previous[1] !== path) {
        expand(parents(path))
      }
    }),
  )
  const toggle = (path: string): void => {
    const change = (previous: Set<string>): Set<string> => toggleExpansion(previous, path)
    if (query().trim() === '') {
      persist(setExpanded(change))
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
    if (listing.node(path) === undefined) {
      return
    }
    batch(() => {
      change('')
      expand(parents(path))
      setFocused(path)
    })
  }
  return {
    activate,
    activePath,
    canReveal: createMemo(() => listing.node(currentPath())?.kind === 'file'),
    change,
    currentPath,
    focus: setFocused,
    incomplete: listing.incomplete,
    isExpanded,
    navigate,
    node: (path: string) => lookup().get(path),
    paths,
    pending: listing.pending,
    position: (path: string) => positions().get(path),
    query,
    reload: listing.reload,
    reveal,
  }
}
