import {dayjs} from 'src/utils/zoned-dayjs'
import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {formatLocalDate} from 'src/utils/format-local-date'
import {type LocalDateRuntime, localDateRuntime} from './local-date-runtime'

export interface UseLocalDateProps {
  readonly initialDate?: Date
  readonly runtime?: LocalDateRuntime
  readonly timeZone?: string
}

const formatDate = (date: Date, timeZone?: string): string =>
  timeZone === undefined ? formatLocalDate(date) : dayjs(date).tz(timeZone).format('YYYY-MM-DD')

const getNextMidnight = (date: Date, timeZone?: string): Date => {
  if (timeZone === undefined) {
    const midnight = new Date(date)
    const nextDayHour = 24
    midnight.setHours(nextDayHour, 0, 0, 0)
    return midnight
  }

  const nextDate = dayjs(date).tz(timeZone).add(1, 'day').format('YYYY-MM-DD')
  return dayjs.tz(nextDate, timeZone).startOf('day').toDate()
}

/** Preserves the initial date until mount, then refreshes at the configured midnight and on visible return. */
export const useLocalDate = (props: UseLocalDateProps = {}): Accessor<string> => {
  const initial = props.initialDate
  const timeZone = () => props.timeZone
  const [date, setDate] = createSignal(initial === undefined ? '' : formatDate(initial, timeZone()))
  onMount(() => {
    const runtime = props.runtime ?? localDateRuntime
    let cancel: (() => void) | undefined
    const refresh = () => {
      cancel?.()
      const now = runtime.now()
      const currentTimeZone = timeZone()
      setDate(formatDate(now, currentTimeZone))
      const midnight = getNextMidnight(now, currentTimeZone)
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
