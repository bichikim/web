import {createMemo, For} from 'solid-js'
import {
  getMovingDays,
  type MovingSelection,
  movingSelectionStorage,
  useSelection,
} from 'src/features/tools'
import {daysInMonth, formatDate, koreanToday, parseDate} from 'src/features/civil-date'
import {PSelect} from '../PSelect'
import {Result} from './Result'

const DAY_OFFSET = -2
const MONTH_COUNT = 12
const YEAR_COUNT = 151
const FIRST_YEAR = 1900
const LAST_YEAR = 2050
const options = (start: number, count: number) =>
  Array.from({length: count}, (_, index) => ({
    label: String(start + index),
    value: String(start + index),
  }))
export const Moving = () => {
  const selection = useSelection<MovingSelection>({
    getDefault: () => {
      const date = parseDate(koreanToday(new Date()))
      return date !== null && date.year >= FIRST_YEAR && date.year <= LAST_YEAR
        ? {month: String(date.month), year: String(date.year)}
        : {month: '1', year: '2026'}
    },
    initial: {month: '1', year: '2026'},
    storage: movingSelectionStorage,
  })
  const year = () => selection.value().year
  const month = () => selection.value().month
  const dates = createMemo(() => getMovingDays(Number(year()), Number(month())))
  const cells = createMemo(() => {
    const selectedYear = Number(year())
    const selectedMonth = Number(month())
    const offset = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)).getUTCDay()
    return Array.from({length: offset + daysInMonth(selectedYear, selectedMonth)}, (_, index) =>
      index < offset
        ? ''
        : formatDate({day: index - offset + 1, month: selectedMonth, year: selectedYear}),
    )
  })
  return (
    <div class="grid gap-4">
      <div class="grid grid-cols-2 gap-3">
        <PSelect
          label="연도"
          options={options(FIRST_YEAR, YEAR_COUNT)}
          value={year()}
          disabled={!selection.ready()}
          onChange={(year) => selection.onChange({...selection.value(), year})}
        />
        <PSelect
          label="월"
          options={options(1, MONTH_COUNT)}
          value={month()}
          disabled={!selection.ready()}
          onChange={(month) => selection.onChange({...selection.value(), month})}
        />
      </div>
      <div
        role="group"
        aria-label={`${year()}년 ${month()}월 손 없는 날 달력`}
        class="grid grid-cols-7 gap-1 text-center text-sm"
      >
        <For each={['일', '월', '화', '수', '목', '금', '토']}>
          {(day) => <span class="py-2 text-muted-foreground">{day}</span>}
        </For>
        <For each={cells()}>
          {(date) => (
            <span
              aria-label={
                date ? `${date}${dates().includes(date) ? ' 손 없는 날' : ''}` : undefined
              }
              data-moving={dates().includes(date) ? '' : undefined}
              class={
                'grid min-h-12 place-content-center rounded-control text-foreground ' +
                'data-[moving]:bg-primary-soft data-[moving]:font-750'
              }
            >
              {date ? Number(date.slice(DAY_OFFSET)) : ''}
              {dates().includes(date) ? ' ·' : ''}
            </span>
          )}
        </For>
      </div>
      <p class="m-0 text-sm text-muted-foreground">
        · 표시가 있는 날짜가 손 없는 날입니다. 음력 9·10·19·20·29·30일을 표시하는 민속 관습이며
        길흉을 보장하지 않습니다.
      </p>
      <Result label="이달의 손 없는 날" value={dates().join('\n')}>
        <span class="flex flex-wrap gap-x-4 gap-y-2">
          <For each={dates()}>{(date) => <span class="whitespace-nowrap">{date}</span>}</For>
        </span>
      </Result>
    </div>
  )
}
