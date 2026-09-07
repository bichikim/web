import {type Accessor, createSignal, onMount} from 'solid-js'

import {createFeedConnectionRepository, type FeedConnectionRepository} from './repository'
import {DEFAULT_FEED_VOICE_ID, type FeedConnection, normalizeFeedUrl} from './schema'
import * as m from '@paraglide/message'

export const FEED_CONNECTIONS_CHANGED_EVENT = 'pomo:focus-room-feed-connections-changed'

export interface FeedConnectionController {
  readonly connections: Accessor<ReadonlyArray<FeedConnection>>
  readonly draftUrl: Accessor<string>
  readonly isLoading: Accessor<boolean>
  readonly message: Accessor<string | null>
  readonly onAdd: () => void
  readonly onAddRecommendation: (url: string) => void
  readonly onDelete: (connectionId: string) => void
  readonly onDraftUrlChange: (url: string) => void
  readonly onVoiceChange: (connectionId: string, voiceId: FeedConnection['voiceId']) => void
}

const requestPersistentStorage = () => {
  const persist = navigator.storage?.persist

  if (persist === undefined) {
    return
  }

  persist.call(navigator.storage).catch((error: unknown) => {
    console.warn('Failed to request persistent feed connection storage.', error)
  })
}

/** Owns persistent feed connection settings for the browser-only settings tab. */
export const useFeedConnections = (): FeedConnectionController => {
  const [connections, setConnections] = createSignal<ReadonlyArray<FeedConnection>>([])
  const [draftUrl, setDraftUrl] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(true)
  const [message, setMessage] = createSignal<string | null>(null)
  let repository: FeedConnectionRepository | null = null

  const saveConnections = (nextConnections: ReadonlyArray<FeedConnection>) => {
    const currentRepository = repository

    if (currentRepository === null) {
      setMessage(m.settings_feed_store_not_ready())
      return false
    }

    try {
      currentRepository.save(nextConnections)
      setConnections(nextConnections)
      window.dispatchEvent(new CustomEvent(FEED_CONNECTIONS_CHANGED_EVENT))
      return true
    } catch (error: unknown) {
      console.error('Failed to save focus room feed connections.', error)
      setMessage(m.settings_feed_save_failed())
      return false
    }
  }

  onMount(() => {
    try {
      const nextRepository = createFeedConnectionRepository(window.localStorage)
      repository = nextRepository
      setConnections(nextRepository.list())
    } catch (error: unknown) {
      console.error('Failed to load focus room feed connections.', error)
      setMessage(m.settings_feed_load_failed())
    } finally {
      setIsLoading(false)
    }
  })

  const addConnection = (url: string) => {
    const normalizedUrl = normalizeFeedUrl(url)

    if (!normalizedUrl.ok) {
      setMessage(m.settings_feed_invalid_url())
      return false
    }

    const currentConnections = connections()

    if (currentConnections.some((connection) => connection.url === normalizedUrl.value)) {
      setMessage(m.settings_feed_duplicate_url())
      return false
    }

    const now = new Date().toISOString()
    const connection = {
      createdAt: now,
      id: crypto.randomUUID(),
      updatedAt: now,
      url: normalizedUrl.value,
      version: 1,
      voiceId: DEFAULT_FEED_VOICE_ID,
    } satisfies FeedConnection

    if (!saveConnections([...currentConnections, connection])) {
      return false
    }

    if (currentConnections.length === 0) {
      requestPersistentStorage()
    }

    setMessage(m.settings_feed_url_saved())
    return true
  }

  const onAdd = () => {
    if (addConnection(draftUrl())) {
      setDraftUrl('')
    }
  }

  const onDelete = (connectionId: string) => {
    const nextConnections = connections().filter((connection) => connection.id !== connectionId)

    if (saveConnections(nextConnections)) {
      setMessage(m.settings_feed_deleted())
    }
  }

  const onVoiceChange = (connectionId: string, voiceId: FeedConnection['voiceId']) => {
    const updatedAt = new Date().toISOString()
    const nextConnections = connections().map((connection) =>
      connection.id === connectionId ? {...connection, updatedAt, voiceId} : connection,
    )

    if (saveConnections(nextConnections)) {
      setMessage(m.settings_feed_voice_changed())
    }
  }

  return {
    connections,
    draftUrl,
    isLoading,
    message,
    onAdd,
    onAddRecommendation: addConnection,
    onDelete,
    onDraftUrlChange: setDraftUrl,
    onVoiceChange,
  }
}
