import {onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

export interface UseFeedRefreshEventsProps {
  readonly connectionChangedEvent: string
  readonly initialize: () => Promise<void>
  readonly onInitializationFailure: () => void
  readonly pollingIntervalMs: number
  readonly refresh: () => Promise<void>
  readonly settingsChangedEvent: string
}

export const useFeedRefreshEvents = (props: UseFeedRefreshEventsProps) => {
  onMount(() => {
    const refreshVisibleFeeds = () => {
      if (document.visibilityState === 'visible') {
        props.refresh().catch((error: unknown) => {
          console.error('Failed to refresh visible focus room feeds.', error)
        })
      }
    }
    const refreshChangedFeeds = () => {
      props.refresh().catch((error: unknown) => {
        console.error('Failed to refresh changed focus room feeds.', error)
      })
    }
    const interval = window.setInterval(() => {
      props.refresh().catch((error: unknown) => {
        console.error('Failed to poll focus room feeds.', error)
      })
    }, props.pollingIntervalMs)

    useEvent(document, 'visibilitychange', refreshVisibleFeeds)
    useEvent(window, props.connectionChangedEvent, refreshChangedFeeds)
    useEvent(window, props.settingsChangedEvent, refreshChangedFeeds)
    props.initialize().catch((error: unknown) => {
      console.error('Failed to initialize focus room feeds.', error)
      props.onInitializationFailure()
    })
    onCleanup(() => {
      window.clearInterval(interval)
    })
  })
}
