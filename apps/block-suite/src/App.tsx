import {
  type BlocksPresenceUser,
  type CollaborativeBlocksWorkspace,
  createCollaborativeBlocksWorkspace,
} from '@winter-love/blocks'
import {createEffect, createMemo, createSignal, onCleanup, Show} from 'solid-js'
import {BlocksEditorMount} from './components/BlocksEditorMount'
import {PresenceList, type PresenceUser} from './components/PresenceList'
import {getCollaborationConfig} from './utils/collaboration-url'
import {createUser} from './utils/user'

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

const getStatusLabel = (status: ConnectionStatus) => {
  if (status === 'connected') {
    return 'Connected'
  }

  if (status === 'connecting') {
    return 'Connecting'
  }

  return 'Disconnected'
}

const App = () => {
  const [workspace, setWorkspace] = createSignal<CollaborativeBlocksWorkspace>()
  const [status, setStatus] = createSignal<ConnectionStatus>('connecting')
  const [users, setUsers] = createSignal<readonly PresenceUser[]>([])
  const statusLabel = createMemo(() => getStatusLabel(status()))

  createEffect(() => {
    const config = getCollaborationConfig()
    const currentUser = createUser()
    const nextWorkspace = createCollaborativeBlocksWorkspace({
      initialText: 'Open this page in another browser window to see live document and cursor sync.',
      room: config.room,
      title: 'Solid Blocks Collaboration',
      user: currentUser,
      websocketUrl: config.websocketUrl,
    })

    const handleStatus = (event: {readonly status: ConnectionStatus}) => {
      setStatus(event.status)
    }

    nextWorkspace.provider.on('status', handleStatus)
    setUsers(toPresenceUsers(nextWorkspace.getUsers()))
    setWorkspace(nextWorkspace)

    onCleanup(() => {
      nextWorkspace.provider.off('status', handleStatus)
      nextWorkspace.destroy()
    })
  })

  return (
    <main class="min-h-screen bg-neutral-100 text-neutral-950">
      <header class="border-b border-neutral-200 bg-white">
        <div class="mx-auto max-w-6xl flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <h1 class="text-xl font-700 leading-tight">Blocks Solid</h1>
            <p class="mt-1 text-sm text-neutral-600">
              Real-time block document editing through Yjs WebSocket sync
            </p>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-3">
            <PresenceList users={users()} />
            <span class="rounded border border-neutral-300 px-3 py-1 text-sm font-600">
              {statusLabel()}
            </span>
          </div>
        </div>
      </header>
      <section class="mx-auto max-w-6xl px-5 py-5">
        <Show when={workspace()} fallback={<div class="p-6">Loading editor</div>}>
          {(readyWorkspace) => (
            <BlocksEditorMount
              class="min-h-[calc(100vh-132px)] overflow-hidden border border-neutral-200 bg-white"
              onUsersChange={(nextUsers) => setUsers(toPresenceUsers(nextUsers))}
              workspace={readyWorkspace()}
            />
          )}
        </Show>
      </section>
    </main>
  )
}

const toPresenceUsers = (users: readonly BlocksPresenceUser[]): readonly PresenceUser[] => users

export default App
