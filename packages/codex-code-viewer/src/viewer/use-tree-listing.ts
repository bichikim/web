import {type Accessor, batch, createEffect, createSignal, on, onCleanup} from 'solid-js'
import type {ScanBatch} from '../shared/contracts'
import type {ViewerPort} from './types'
import {readWorkspaceStream} from './read-workspace-stream'
import {createTreeModel} from './file-tree/create-tree-model'
import type {FileTreeNode} from './file-tree/types'
import {useLatestRequest} from './use-latest-request'
import {createTreeStreamConsumer} from './create-tree-stream-consumer'
import {filterFileTree} from './file-tree/filter-file-tree'

interface UseTreeListingProps {
  readonly directories: Accessor<string[] | undefined>
  readonly onError: (error: unknown) => void
  readonly port: ViewerPort
  readonly query: Accessor<string>
  readonly revision: Accessor<number>
  readonly session: Accessor<string | undefined>
  readonly visible: Accessor<boolean>
}
interface UseTreeListingResult {
  readonly incomplete: Accessor<boolean>
  readonly node: (path: string) => FileTreeNode | undefined
  readonly pending: Accessor<boolean>
  readonly reload: () => Promise<void>
  readonly tree: Accessor<readonly FileTreeNode[]>
}

/** Streams changed directory branches, cancelling replaced or hidden requests. */
export const useTreeListing = (props: UseTreeListingProps): UseTreeListingResult => {
  const browse = createTreeModel()
  const search = createTreeModel()
  const [tree, setTree] = createSignal<readonly FileTreeNode[]>([], {equals: false})
  const [incomplete, setIncomplete] = createSignal(false)
  const request = useLatestRequest((error) => {
    setIncomplete(true)
    props.onError(error)
  })
  let current = browse
  let controller: AbortController | null = null
  let observing = false
  const load = async (force: boolean): Promise<void> => {
    controller?.abort()
    request.cancel()
    const session = props.session()
    if (session === undefined) {
      return
    }
    if (!props.visible()) {
      if (observing) {
        observing = false
        await props.port
          .call('code.tree', {directories: [], session, stream: true})
          .catch(props.onError)
      }
      return
    }
    observing = true
    const active = new AbortController()
    controller = active
    const directories = props.directories()
    const query = props.query().trim().toLowerCase()
    const model = directories === undefined ? search : browse
    if (directories === undefined) {
      search.clear()
    }
    model.begin()
    current = model
    setTree(directories === undefined ? filterFileTree(browse.roots(), query) : model.roots())
    const versions = force || directories === undefined ? {} : model.versions(directories)
    let first = true
    setIncomplete(false)
    const apply = (entry: ScanBatch): void => {
      if (active.signal.aborted || session !== props.session()) {
        return
      }
      if (entry.failed) {
        setIncomplete(true)
      }
      if (first && directories === undefined) {
        search.clear()
        setTree(search.roots())
      }
      first = false
      if (entry.snapshot && directories === undefined) {
        browse.receive(entry)
        model.receive({
          ...entry,
          directories: entry.directories.filter((path) => path.toLowerCase().includes(query)),
          files: entry.files.filter((file) => file.path.toLowerCase().includes(query)),
        })
        setTree(model.roots())
        return
      }
      if (
        directories !== undefined ||
        entry.snapshot ||
        entry.files.length > 0 ||
        entry.directories.length > 0
      ) {
        model.receive(entry)
        setTree(model.roots())
      }
    }
    const consumer = createTreeStreamConsumer({
      receive: (entries) => {
        batch(() => {
          for (const entry of entries) {
            apply(entry)
          }
        })
      },
      signal: active.signal,
    })
    await request.run(async () => {
      try {
        await readWorkspaceStream({
          input: {
            session,
            ...(directories === undefined ? {query} : {directories}),
            ...(Object.keys(versions).length === 0 ? {} : {versions}),
          },
          name: 'code.tree',
          port: props.port,
          receive: consumer.receive,
          signal: active.signal,
        })
      } finally {
        consumer.flush()
        if (
          first &&
          directories === undefined &&
          !active.signal.aborted &&
          session === props.session()
        ) {
          search.clear()
          setTree(search.roots())
        }
      }
    })
  }
  createEffect(
    on(props.session, () => {
      controller?.abort()
      request.cancel()
      observing = false
      browse.clear()
      search.clear()
      setTree([])
      setIncomplete(false)
    }),
  )
  createEffect(
    on([props.visible, props.session, props.directories, props.query, props.revision], () => {
      load(false)
    }),
  )
  onCleanup(() => controller?.abort())
  return {
    incomplete,
    node: (path: string): FileTreeNode | undefined => {
      tree()
      return current.node(path) ?? browse.node(path)
    },
    pending: request.pending,
    reload: (): Promise<void> => load(true),
    tree,
  }
}
