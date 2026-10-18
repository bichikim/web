import {subscribeEvent} from 'src/utils/subscribe-event'

interface WebStorageSubscriptionOptions {
  readonly key?: string
  readonly onChange: (key: string | null) => void
  readonly includeUnknownArea?: boolean
}

/** 명시적으로 구독을 해제할 때까지 로컬 스토리지 변경과 전체 삭제 이벤트를 구독한다. */
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
