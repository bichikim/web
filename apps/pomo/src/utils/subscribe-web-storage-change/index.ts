import {subscribeEvent} from 'src/utils/subscribe-event'

interface WebStorageSubscriptionOptions {
  readonly key?: string
  readonly onChange: (key: string | null) => void
  readonly includeUnknownArea?: boolean
}

/** Subscribes to local storage updates and clear events until explicitly unsubscribed. */
export const subscribeWebStorageChange = (options: WebStorageSubscriptionOptions): (() => void) => {
  const handleStorage = (event: Event) => {
    if (!(event instanceof StorageEvent)) {
      return
    }
    const matchesArea =
      event.storageArea === null
        ? options.includeUnknownArea !== false
        : event.storageArea === globalThis.localStorage
    if (
      matchesArea &&
      (options.key === undefined || event.key === null || event.key === options.key)
    ) {
      options.onChange(event.key)
    }
  }
  return subscribeEvent(globalThis, 'storage', handleStorage)
}
