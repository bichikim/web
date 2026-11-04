import {
  createDesktopMusicActionChannel,
  type DesktopMusicAction,
  isDesktopMusicAction,
  isDesktopMusicActionConnectionMessage,
} from '../../features/desktop-mode/desktop-music-actions'
import {usePEvents} from '../../features/focus-room-dialogue/event-context'
import {createEffect, on, onCleanup, onMount} from 'solid-js'
import {useOptionalSoundEffects} from '../../features/sound-effects/context'
import {runSoundEffectsEventAction} from '../../features/sound-effects/run-sound-effects-event-action'

export const DesktopWallpaperEventActionBridge = () => {
  const events = usePEvents()
  const soundEffects = useOptionalSoundEffects()

  createEffect(
    on(
      () => soundEffects?.status(),
      (status) => {
        if (soundEffects === undefined || status === 'loading') {
          return
        }

        // The runner retains actions while the home-owned playback catalog is loading.
        const unregister = events.registerEventActionHandler?.((actionId) =>
          runSoundEffectsEventAction(soundEffects, actionId),
        )
        onCleanup(() => unregister?.())
      },
    ),
  )

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
