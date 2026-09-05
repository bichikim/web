import {onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

const RETRY_DELAY = 300_000

/** Retries persisted deletions while the room is mounted. */
export const useDeletionRecovery = (retryDeletions: () => Promise<void>) => {
  onMount(() => {
    const retry = () => {
      retryDeletions().catch((error: unknown) => {
        console.error('Failed to retry memory memo deletions.', error)
      })
    }
    retry()
    const timer = setInterval(retry, RETRY_DELAY)
    useEvent(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        retry()
      }
    })
    onCleanup(() => clearInterval(timer))
  })
}
