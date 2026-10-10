import {type Accessor, createEffect, createSignal, on, onCleanup, untrack} from 'solid-js'
import type {ScanBatch, WorkspaceTree} from '../shared/contracts'
import type {ViewerPort} from './types'
import {readWorkspaceStream} from './read-workspace-stream'
import {type DirectoryContents, mergeDirectoryBatch} from './merge-directory-batch'
import {useLatestRequest} from './use-latest-request'

interface TreeListingOptions {
  readonly directories: Accessor<string[] | undefined>
  readonly onError: (error: unknown) => void
  readonly port: ViewerPort
  readonly query: Accessor<string>
  readonly revision: Accessor<number>
  readonly session: Accessor<string | undefined>
  readonly visible: Accessor<boolean>
}
const emptyTree = (): WorkspaceTree => ({directories: [], files: [], truncated: false})

/** Streams the requested scope, cancelling replaced or hidden requests. */
export const useTreeListing = (options: TreeListingOptions) => {
  const [listing, setListing] = createSignal<WorkspaceTree>(emptyTree())
  const [incomplete, setIncomplete] = createSignal(false)
  const request = useLatestRequest((error) => {
    setIncomplete(true)
    options.onError(error)
  })
  let controller: AbortController | null = null
  let observing = false
  const reload = async (): Promise<void> => {
    controller?.abort()
    request.cancel()
    const session = options.session()
    if (session === undefined) {
      return
    }
    if (!options.visible()) {
      if (observing) {
        observing = false
        await options.port
          .call('code.tree', {directories: [], session, stream: true})
          .catch(options.onError)
      }
      return
    }
    observing = true
    const active = new AbortController()
    controller = active
    const directories = options.directories()
    const initial = untrack(listing)
    const received = new Map<string, DirectoryContents>()
    let first = true
    setIncomplete(false)
    const receive = (entry: ScanBatch): void => {
      if (active.signal.aborted || session !== options.session()) {
        return
      }
      if (first && directories === undefined) {
        setListing(emptyTree())
      }
      first = false
      const previous = received.get(entry.directory)
      const contents: DirectoryContents = {
        directories: [...(previous?.directories ?? []), ...entry.directories],
        files: [...(previous?.files ?? []), ...entry.files],
      }
      received.set(entry.directory, contents)
      if (entry.failed) {
        setIncomplete(true)
      }
      setListing((previous) => mergeDirectoryBatch({batch: entry, contents, initial, previous}))
    }
    await request.run(() =>
      readWorkspaceStream({
        input: {
          session,
          ...(directories === undefined ? {query: options.query().trim()} : {directories}),
        },
        name: 'code.tree',
        port: options.port,
        receive,
        signal: active.signal,
      }),
    )
  }
  createEffect(
    on(options.session, () => {
      controller?.abort()
      request.cancel()
      observing = false
      setListing(emptyTree())
      setIncomplete(false)
    }),
  )
  createEffect(
    on(
      [options.visible, options.session, options.directories, options.query, options.revision],
      () => {
        reload()
      },
    ),
  )
  onCleanup(() => controller?.abort())
  return {incomplete, listing, pending: request.pending, reload}
}
