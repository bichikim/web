import type {Accessor} from 'solid-js'
import type {CodeLocation, ViewerConnection, ViewerSession} from '../shared/contracts'
import type {FileMutation} from './types'

interface FileMutationHandlerProps {
  readonly go: (location: CodeLocation) => Promise<void>
  readonly onMove?: (session: ViewerSession) => void
  readonly onChange: (change: FileMutation) => void
  readonly receive: (value: ViewerConnection) => Promise<void>
  readonly session: Accessor<ViewerConnection | null>
}
/** Updates file history and the displayed document after a workspace entry changes. */
export const createFileMutationHandler =
  (props: FileMutationHandlerProps) =>
  async (change: FileMutation): Promise<void> => {
    props.onChange(change)
    const current = props.session()
    if (current === null || !('document' in current)) {
      return
    }
    const {location} = current.document
    if (location.path !== change.source && !location.path.startsWith(`${change.source}/`)) {
      return
    }
    switch (change.action) {
      case 'copy':
        return
      case 'rename':
      case 'cut':
        props.onMove?.(current)
        await props.go({
          ...location,
          path: change.entry.path + location.path.slice(change.source.length),
        })
        return
      case 'delete':
        await props.receive({session: current.session, workspace: current.workspace})
        return
      default: {
        const exhaustive: never = change.action
        return exhaustive
      }
    }
  }
