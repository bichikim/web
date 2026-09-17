import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {formatLocalDate} from 'src/utils/format-local-date'
import {type LocalDateRuntime, localDateRuntime} from './local-date-runtime'

export interface UseLocalDateProps {
  readonly initialDate?: Date
  readonly runtime?: LocalDateRuntime
}

/** Preserves the initial date until mount, then refreshes at local midnight and on visible return. */
export const useLocalDate = (props: UseLocalDateProps = {}): Accessor<string> => {
  const initial = props.initialDate
  const [date, setDate] = createSignal(initial === undefined ? '' : formatLocalDate(initial))
  onMount(() => {
    const runtime = props.runtime ?? localDateRuntime
    let cancel: (() => void) | undefined
    const refresh = () => {
      cancel?.()
      const now = runtime.now()
      setDate(formatLocalDate(now))
      const midnight = new Date(now)
      const nextDayHour = 24
      midnight.setHours(nextDayHour, 0, 0, 0)
      cancel = runtime.schedule(refresh, midnight.getTime() - now.getTime())
    }
    refresh()
    const unsubscribe = runtime.subscribe((isHidden) => {
      if (!isHidden) {
        refresh()
      }
    })
    onCleanup(() => {
      cancel?.()
      unsubscribe()
    })
  })
  return date
}
