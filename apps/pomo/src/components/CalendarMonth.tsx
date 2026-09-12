import {type JSX} from 'solid-js'
import {useAuth} from 'src/features/auth/AuthProvider'
import {useMemoryMemos} from 'src/features/memory-assist'
import {monthEnvironment} from './calendar-month/environment'
import {useMonth} from './calendar-month/use-month'
import {CalendarHeader} from './calendar-month/Header'
import {CalendarGrid} from './calendar-month/Grid'
import {CalendarAgenda} from './calendar-month/Agenda'

interface CalendarMonthProps {
  readonly revision?: number
  readonly settings?: JSX.Element
}

export const CalendarMonth = (props: CalendarMonthProps) => {
  const month = useMonth({
    authentication: useAuth(),
    environment: monthEnvironment,
    get revision() {
      return props.revision
    },
  })
  const memos = useMemoryMemos()
  return (
    <section aria-labelledby="calendar-month-title" class="grid gap-4">
      <CalendarHeader
        month={month.month()}
        onChange={month.changeMonth}
        settings={props.settings}
      />
      <CalendarGrid
        days={month.days()}
        eventsByDay={month.eventsByDay()}
        onSelect={month.selectDate}
        selectedKey={month.selectedKey()}
        todayKey={month.todayKey}
      />
      <CalendarAgenda
        calendar={month.calendar()}
        failed={month.failed()}
        loginRequired={month.loginRequired()}
        loading={month.loading()}
        memos={memos}
        refreshFailed={month.refreshFailed()}
        selectedDate={month.selectedDate()}
        selectedEvents={month.selectedEvents()}
      />
    </section>
  )
}
