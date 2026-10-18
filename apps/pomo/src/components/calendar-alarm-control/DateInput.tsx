import {PInput} from 'src/components/p-input/PInput'
import {type Accessor} from 'solid-js'
import * as m from '@paraglide/message'
import {localDateRuntime, type LocalDateRuntime, useLocalDate} from '../../features/civil-date'
import {INPUT_CLASSES} from './input-classes'

interface CalendarAlarmDateInputProps {
  /** 날짜 하한 계산에 사용할 현재 시각을 읽습니다. */
  readonly clock: Accessor<Date>
  /** 사용자가 선택한 날짜를 알람 초안에 전달합니다. */
  readonly onInput: (value: string) => void
  /** 날짜 경계를 계산할 캘린더 시간대를 읽습니다. */
  readonly timeZone: Accessor<string>
  /** 현재 알람 초안의 날짜를 읽습니다. */
  readonly value: Accessor<string>
}

export const CalendarAlarmDateInput = (props: CalendarAlarmDateInputProps) => {
  const clock = () => props.clock()
  const timeZone = () => props.timeZone()
  const runtime: LocalDateRuntime = {
    now: clock,
    schedule: localDateRuntime.schedule,
    subscribe: localDateRuntime.subscribe,
  }
  const minimumDate = useLocalDate({runtime, timeZone})

  return (
    <label class="grid gap-1.5 text-sm font-650">
      <span>{m.calendar_alarm_date()}</span>
      <PInput
        unstyled
        class={INPUT_CLASSES}
        min={minimumDate()}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        type="date"
        value={props.value()}
      />
    </label>
  )
}
