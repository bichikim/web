export type DesktopMusicAction = 'music-start' | 'music-stop'

export interface DesktopMusicActionMessage {
  readonly actionId: DesktopMusicAction
}

export type DesktopMusicActionConnectionMessage =
  | {readonly type: 'player-ready'}
  | {readonly type: 'request-player-ready'}
  | {readonly type: 'player-unavailable'}

export interface DesktopMusicActionInbox {
  close(): void
  subscribe(handler: (actionId: DesktopMusicAction) => void): () => void
}

const DESKTOP_MUSIC_ACTION_CHANNEL = 'pomo:desktop-music-action'

export const createDesktopMusicActionChannel = (): BroadcastChannel | null => {
  if (typeof globalThis.BroadcastChannel !== 'function') {
    return null
  }

  return new globalThis.BroadcastChannel(DESKTOP_MUSIC_ACTION_CHANNEL)
}

export const isDesktopMusicAction = (value: unknown): value is DesktopMusicAction =>
  value === 'music-start' || value === 'music-stop'

export const isDesktopMusicActionMessage = (value: unknown): value is DesktopMusicActionMessage => {
  if (typeof value !== 'object' || value === null || !('actionId' in value)) {
    return false
  }

  return isDesktopMusicAction(value.actionId)
}

export const isDesktopMusicActionConnectionMessage = (
  value: unknown,
): value is DesktopMusicActionConnectionMessage => {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false
  }

  switch (value.type) {
    case 'player-ready':
    case 'request-player-ready':
    case 'player-unavailable':
      return true
    default:
      return false
  }
}

export const createDesktopMusicActionInbox = (): DesktopMusicActionInbox => {
  const channel =
    typeof globalThis.document === 'undefined' ? null : createDesktopMusicActionChannel()
  const pendingMusicActions: DesktopMusicAction[] = []
  const subscribers = new Set<(actionId: DesktopMusicAction) => void>()
  let isClosed = false

  const dispatchMusicAction = (actionId: DesktopMusicAction) => {
    const actionSubscribers = [...subscribers]
    if (actionSubscribers.length === 0) {
      pendingMusicActions.push(actionId)
      return
    }

    for (const subscriber of actionSubscribers) {
      subscriber(actionId)
    }
  }
  const flushPendingMusicActions = () => {
    const queuedActions = pendingMusicActions.splice(0)
    for (const actionId of queuedActions) {
      dispatchMusicAction(actionId)
    }
  }
  const handleMessage = (event: MessageEvent<unknown>) => {
    const message = event.data
    if (isDesktopMusicActionMessage(message)) {
      dispatchMusicAction(message.actionId)
      return
    }
    if (!isDesktopMusicActionConnectionMessage(message)) {
      return
    }

    switch (message.type) {
      case 'request-player-ready':
        if (subscribers.size > 0) {
          channel?.postMessage({type: 'player-ready'})
        }
        break
      case 'player-ready':
      case 'player-unavailable':
        break
      default: {
        const exhaustiveMessage: never = message
        return exhaustiveMessage
      }
    }
  }
  channel?.addEventListener('message', handleMessage)

  const subscribe = (handler: (actionId: DesktopMusicAction) => void): (() => void) => {
    if (isClosed) {
      return () => undefined
    }

    const isFirstSubscriber = subscribers.size === 0
    const subscriber = (actionId: DesktopMusicAction) => handler(actionId)
    subscribers.add(subscriber)
    flushPendingMusicActions()
    if (isFirstSubscriber) {
      channel?.postMessage({type: 'player-ready'})
    }

    let isSubscribed = true
    return () => {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false
      subscribers.delete(subscriber)
      if (!isClosed && subscribers.size === 0) {
        channel?.postMessage({type: 'player-unavailable'})
      }
    }
  }
  const close = () => {
    if (isClosed) {
      return
    }

    if (subscribers.size > 0) {
      channel?.postMessage({type: 'player-unavailable'})
    }
    isClosed = true
    subscribers.clear()
    pendingMusicActions.splice(0)
    channel?.removeEventListener('message', handleMessage)
    channel?.close()
  }

  return {close, subscribe}
}
