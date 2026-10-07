import {cx} from 'class-variance-authority'
import {createMemo, createSignal, Show} from 'solid-js'
import type {BirthInput} from 'k-saju'
import {getConvertibleLunarDays} from 'src/features/tools'
import {PDatePicker} from '../../p-date-picker/PDatePicker'
import {PSelect} from '../../p-select/PSelect'

const MINIMUM_BIRTH_DATE = '1900-01-01'
const MAXIMUM_BIRTH_DATE = '2050-12-31'
const FIRST_LUNAR_YEAR = 1900
const LAST_LUNAR_YEAR = 2050
const MONTHS_PER_YEAR = 12

const LUNAR_YEAR_OPTIONS = Array.from(
  {length: LAST_LUNAR_YEAR - FIRST_LUNAR_YEAR + 1},
  (_, index) => {
    const value = String(FIRST_LUNAR_YEAR + index)
    return {label: value, value}
  },
)
const LUNAR_MONTH_OPTIONS = Array.from({length: MONTHS_PER_YEAR}, (_, index) => {
  const value = String(index + 1)
  return {label: value, value}
})

const FIELD_CLASSES = cx(
  'min-h-11 w-full rounded-3 border border-white/20 bg-#211a2b px-3 text-#f8edf1',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-#f0c99a',
)
const BUTTON_CLASSES = cx(
  'min-h-11 rounded-3 bg-#f0c99a px-5 font-750 text-#241927 hover:bg-#f8dcba',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
)
const QUESTION_CLASSES = cx(
  'min-h-24 w-full rounded-3 border border-white/20 bg-#211a2b p-3 text-#f8edf1',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-#f0c99a',
)

export interface SajuFormInput {
  readonly birth: BirthInput
  readonly gender: 'M' | 'F' | 'N'
  readonly question: string
}

export interface SajuFormProps {
  readonly onSubmit: (input: SajuFormInput) => void
  readonly ready?: boolean
}

export function SajuForm(props: SajuFormProps) {
  const [solarDate, setSolarDate] = createSignal('1995-03-16')
  const [calendar, setCalendar] = createSignal<'solar' | 'lunar'>('solar')
  const [lunarYear, setLunarYear] = createSignal('1995')
  const [lunarMonth, setLunarMonth] = createSignal('3')
  const [lunarDay, setLunarDay] = createSignal('16')
  const [leapMonth, setLeapMonth] = createSignal(false)
  const lunarDayOptions = createMemo(() =>
    getConvertibleLunarDays({
      leap: leapMonth(),
      month: Number(lunarMonth()),
      year: Number(lunarYear()),
    }).map((day) => ({label: String(day), value: String(day)})),
  )
  const selectedLunarDay = createMemo(() => {
    const options = lunarDayOptions()
    return (
      options.find((option) => option.value === lunarDay())?.value ?? options.at(-1)?.value ?? ''
    )
  })

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget
    if (!(form instanceof HTMLFormElement)) {
      return
    }

    const values = new FormData(form)
    const calendarValue = calendar()
    const day = selectedLunarDay()
    const date =
      calendarValue === 'solar'
        ? solarDate()
        : day === ''
          ? ''
          : `${lunarYear()}-${lunarMonth().padStart(2, '0')}-${day.padStart(2, '0')}`
    const time = String(values.get('time') ?? '')
    const genderValue = values.get('gender')
    const gender = genderValue === 'F' || genderValue === 'N' ? genderValue : 'M'
    const birth: BirthInput = {calendar: calendarValue, date, ...(time ? {time} : {})}
    if (calendarValue === 'lunar') {
      birth.isLeapMonth = leapMonth()
    }
    props.onSubmit({birth, gender, question: String(values.get('question') ?? '').trim()})
  }

  return (
    <form
      class="grid items-start gap-4 rounded-6 border border-white/10 bg-white/5 p-5 sm:grid-cols-2"
      onSubmit={handleSubmit}
    >
      <Show
        when={calendar() === 'solar'}
        fallback={
          <div class="grid gap-2 sm:col-span-2">
            <span class="text-sm font-650">음력 생년월일</span>
            <div class="grid grid-cols-3 gap-2">
              <PSelect
                label="음력 연도"
                options={LUNAR_YEAR_OPTIONS}
                value={lunarYear()}
                onChange={setLunarYear}
              />
              <PSelect
                label="음력 월"
                options={LUNAR_MONTH_OPTIONS}
                value={lunarMonth()}
                onChange={setLunarMonth}
              />
              <Show when={lunarDayOptions().length > 0}>
                <PSelect
                  label="음력 일"
                  options={lunarDayOptions()}
                  value={selectedLunarDay()}
                  onChange={setLunarDay}
                />
              </Show>
            </div>
            <Show when={lunarDayOptions().length === 0}>
              <p class="m-0 text-sm text-#f2a7b8" role="status">
                선택한 음력 월 또는 윤달에 해당하는 날짜가 없습니다.
              </p>
            </Show>
          </div>
        }
      >
        <PDatePicker
          label="생년월일"
          value={solarDate()}
          min={MINIMUM_BIRTH_DATE}
          max={MAXIMUM_BIRTH_DATE}
          clearable
          onChange={setSolarDate}
        />
      </Show>
      <label class="grid gap-2 text-sm font-650">
        출생 시각 (모르면 비워두기)
        <input class={FIELD_CLASSES} name="time" type="time" value="07:30" />
      </label>
      <label class="grid gap-2 text-sm font-650">
        달력
        <select
          class={FIELD_CLASSES}
          name="calendar"
          value={calendar()}
          onChange={(event) =>
            setCalendar(event.currentTarget.value === 'lunar' ? 'lunar' : 'solar')
          }
        >
          <option value="solar">양력</option>
          <option value="lunar">음력</option>
        </select>
      </label>
      <label class="grid gap-2 text-sm font-650">
        대운 계산 입력
        <select class={FIELD_CLASSES} name="gender">
          <option value="M">남성</option>
          <option value="F">여성</option>
          <option value="N">지정하지 않음 (대운 생략)</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm text-#d2c4d7">
        <input
          checked={leapMonth()}
          name="leapMonth"
          type="checkbox"
          onChange={(event) => setLeapMonth(event.currentTarget.checked)}
        />
        음력 윤달
      </label>
      <label class="grid gap-2 text-sm font-650 sm:col-span-2">
        질문
        <textarea
          class={QUESTION_CLASSES}
          name="question"
          placeholder="예: 제 성향을 어떻게 해석하나요?"
          required
        />
      </label>
      <button class={BUTTON_CLASSES} disabled={props.ready === false} type="submit">
        사주 풀이 생성
      </button>
    </form>
  )
}
