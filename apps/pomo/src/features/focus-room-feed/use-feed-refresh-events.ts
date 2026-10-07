import {visibilityInterval} from 'src/utils/visibility-interval'
import {type Accessor, createEffect, on, onCleanup, onMount, untrack} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

export interface UseFeedRefreshEventsProps {
  readonly connectionChangedEvent: string
  readonly initialize: () => Promise<void>
  readonly onInitializationFailure: () => void
  readonly pollingIntervalMs: number
  readonly refresh: () => Promise<void>
  readonly settings: Accessor<unknown>
}

export const useFeedRefreshEvents = (props: UseFeedRefreshEventsProps) => {
  onMount(() => {
    const refreshChangedFeeds = () => {
      props.refresh().catch((error: unknown) => {
        console.error('Failed to refresh changed focus room feeds.', error)
      })
    }
    const stopPolling = visibilityInterval({
      callback: () => {
        props.refresh().catch((error: unknown) => {
          console.error('Failed to poll focus room feeds.', error)
        })
      },
      interval: props.pollingIntervalMs,
      runOverdueOnVisible: true,
    })

    useEvent(globalThis, props.connectionChangedEvent, refreshChangedFeeds)
    let previousSettings = untrack(props.settings)
    createEffect(
      on(
        props.settings,
        (settings) => {
          const previous = previousSettings
          previousSettings = settings
          // initialize already restores settings for the first feed sync.
          if (settings !== null && previous !== null) {
            refreshChangedFeeds()
          }
        },
        {defer: true},
      ),
    )
    props.initialize().catch((error: unknown) => {
      console.error('Failed to initialize focus room feeds.', error)
      props.onInitializationFailure()
    })
    onCleanup(stopPolling)
  })
}
