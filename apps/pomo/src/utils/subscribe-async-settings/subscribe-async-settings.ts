import {subscribeEvent} from 'src/utils/subscribe-event'

interface AsyncSettingsSubscriptionOptions<Value> {
  readonly target: EventTarget
  readonly eventName: string
  readonly parse: (value: unknown) => Value | null
  readonly read: () => Promise<Value>
  readonly onChange: (value: Value) => void
  readonly onError: (error: unknown) => void
}

/** Subscribes before reading settings, ignoring stale reads and completions after disposal. */
export const subscribeAsyncSettings = <Value>(
  options: AsyncSettingsSubscriptionOptions<Value>,
): (() => void) => {
  let disposed = false
  let revision = 0
  const handleChange = (event: Event) => {
    if (!(event instanceof CustomEvent)) {
      return
    }
    const value = options.parse(event.detail)
    if (value !== null) {
      revision += 1
      options.onChange(value)
    }
  }
  const unsubscribe = subscribeEvent(options.target, options.eventName, handleChange, {
    onUnsubscribe: () => {
      disposed = true
    },
  })
  const initialRevision = revision
  options
    .read()
    .then((value) => {
      if (!disposed && revision === initialRevision) {
        options.onChange(value)
      }
    })
    .catch(options.onError)
  return unsubscribe
}
