import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {formatLocalDate} from 'src/utils/format-local-date'
import {dateEnvironment} from './environment'

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
      cancel = dateEnvironment.schedule(refresh, midnight.getTime() - now.getTime())
    }
    untrack(refresh)
    const unsubscribe = dateEnvironment.subscribe(refresh)
    onCleanup(() => {
      cancel?.()
      unsubscribe()
    })
  })
  return date
}
