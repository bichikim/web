import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {formatLocalDate} from 'src/utils/format-local-date'
import {localDateRuntime} from './local-date-runtime'

export interface UseLocalDateProps {
  readonly initialDate: Date
  readonly now: () => Date
}

export const useLocalDate = (props: UseLocalDateProps): Accessor<string> => {
  const [date, setDate] = createSignal(formatLocalDate(props.initialDate))
  createEffect(() => {
    let cancel: (() => void) | undefined
    const refresh = () => {
      cancel?.()
      const now = props.now()
      setDate(formatLocalDate(now))
      const midnight = new Date(now)
      const nextDayHour = 24
      midnight.setHours(nextDayHour, 0, 0, 0)
      cancel = localDateRuntime.schedule(refresh, midnight.getTime() - now.getTime())
    }
    untrack(refresh)
    const unsubscribe = localDateRuntime.subscribe((isHidden) => {
      if (isHidden) {
        return
      }
      refresh()
    })
    onCleanup(() => {
      cancel?.()
      unsubscribe()
    })
  })
  return date
}
