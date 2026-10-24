import {onCleanup, onMount} from 'solid-js'
import {visibilityInterval} from 'src/utils/visibility-interval'

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
    onCleanup(
      visibilityInterval({
        callback: retry,
        interval: RETRY_DELAY,
        runOverdueOnVisible: true,
      }),
    )
  })
}
