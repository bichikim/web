import {
  createDesktopMusicActionChannel,
  type DesktopMusicAction,
  isDesktopMusicAction,
  isDesktopMusicActionConnectionMessage,
} from '../../features/desktop-mode/desktop-music-actions'
import {usePEvents} from '../../features/focus-room-dialogue/event-context'
import {onCleanup, onMount} from 'solid-js'

export const DesktopWallpaperEventActionBridge = () => {
  const events = usePEvents()

  onMount(() => {
    const channel = createDesktopMusicActionChannel()
    const pendingMusicActions: DesktopMusicAction[] = []
    let isPlayerReady = false
    const flushPendingMusicActions = () => {
      const queuedActions = pendingMusicActions.splice(0)
      for (const actionId of queuedActions) {
        channel?.postMessage({actionId})
      }
    }
    const handleChannelMessage = (event: MessageEvent<unknown>) => {
      const message = event.data
      if (!isDesktopMusicActionConnectionMessage(message)) {
        return
      }

      switch (message.type) {
        case 'player-ready':
          isPlayerReady = true
          flushPendingMusicActions()
          return
        case 'player-unavailable':
          isPlayerReady = false
          break
        case 'request-player-ready':
          break
        default: {
          const exhaustiveMessage: never = message
          return exhaustiveMessage
        }
      }
    }
    channel?.addEventListener('message', handleChannelMessage)
    channel?.postMessage({type: 'request-player-ready'})
    const unregisterHandler =
      channel === null
        ? undefined
        : events.registerEventActionHandler?.((actionId) => {
            if (!isDesktopMusicAction(actionId)) {
              return false
            }

            if (isPlayerReady) {
              channel.postMessage({actionId})
            } else {
              pendingMusicActions.push(actionId)
            }
            return true
          })
    const unregisterExecutor = events.registerEventActionExecutor(() => undefined, {
      mode: 'deferred',
    })
    onCleanup(() => {
      unregisterHandler?.()
      unregisterExecutor()
      channel?.removeEventListener('message', handleChannelMessage)
      channel?.close()
    })
  })

  return null
}
