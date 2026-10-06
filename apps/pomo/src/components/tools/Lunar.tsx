import {createEffect, createMemo, createSignal, Show} from 'solid-js'
import {
  getConvertibleLunarDays,
  getLunarToSolarResult,
  type LunarDirection,
  lunarDirectionStorage,
  solarToLunar,
  useSelection,
} from 'src/features/tools'
import {PDatePicker} from '../p-date-picker/PDatePicker'
import {PSelect} from '../p-select/PSelect'
import {PSwitch} from '../p-switch/PSwitch'
import {Result} from './Result'

const MONTH_COUNT = 12
const YEAR_COUNT = 152
const FIRST_YEAR = 1899
const options = (start: number, count: number) =>
  Array.from({length: count}, (_, index) => ({
    label: String(start + index),
    value: String(start + index),
  }))
export const Lunar = () => {
  const selection = useSelection<LunarDirection>({initial: 'solar', storage: lunarDirectionStorage})
  const direction = selection.value
  const [solar, setSolar] = createSignal('')
  const [year, setYear] = createSignal('2026')
  const [month, setMonth] = createSignal('1')
  const [day, setDay] = createSignal('1')
  const [leap, setLeap] = createSignal(false)
  const lunarDayOptions = createMemo(() => {
    if (direction() !== 'lunar') {
      return []
    }
    return getConvertibleLunarDays({
      leap: leap(),
      month: Number(month()),
      year: Number(year()),
    }).map((value) => ({label: String(value), value: String(value)}))
  })
  const selectedLunarDay = createMemo(() => {
    const currentDay = day()
    const availableDays = lunarDayOptions()
    return (
      availableDays.find((option) => option.value === currentDay)?.value ??
      availableDays.at(-1)?.value ??
      currentDay
    )
  })
  createEffect(() => {
    const availableDays = lunarDayOptions()
    if (availableDays.length === 0) {
      return
    }
    const currentDay = day()
    if (availableDays.some((option) => option.value === currentDay)) {
      return
    }
    const lastAvailableDay = availableDays.at(-1)
    if (lastAvailableDay !== undefined) {
      setDay(lastAvailableDay.value)
    }
  })
  const lunarConversion = createMemo(() =>
    getLunarToSolarResult({
      day: Number(selectedLunarDay()),
      leap: leap(),
      month: Number(month()),
      year: Number(year()),
    }),
  )
  const result = createMemo(() => {
    if (direction() === 'lunar') {
      const conversion = lunarConversion()
      return conversion.status === 'converted' ? conversion.value : null
    }
    const value = solarToLunar(solar())
    return value === null
      ? null
      : `${value.year}년 ${value.leap ? '윤' : ''}${value.month}월 ${value.day}일`
  })
  const fallbackMessage = createMemo(() => {
    if (direction() === 'solar') {
      return solar()
        ? '존재하지 않는 날짜·윤달이거나 지원 범위를 벗어났습니다.'
        : '날짜를 선택해주세요.'
    }
    switch (lunarConversion().status) {
      case 'converted':
        return ''
      case 'invalid':
        return '존재하지 않는 날짜·윤달입니다.'
      case 'unsupported':
        return '지원 범위를 벗어난 날짜입니다.'
    }
  })
  return (
    <div class="grid gap-4">
      <PSelect
        label="변환 방향"
        options={[
          {label: '양력 → 음력', value: 'solar'},
          {label: '음력 → 양력', value: 'lunar'},
        ]}
        value={direction()}
        disabled={!selection.ready()}
        onChange={selection.onChange}
      />
      <Show
        when={direction() === 'solar'}
        fallback={
          <>
            <div class="grid grid-cols-3 gap-2">
              <PSelect
                label="음력 연도"
                options={options(FIRST_YEAR, YEAR_COUNT)}
                value={year()}
                onChange={setYear}
              />
              <PSelect
                label="음력 월"
                options={options(1, MONTH_COUNT)}
                value={month()}
                onChange={setMonth}
              />
              <Show when={lunarDayOptions().length > 0}>
                <PSelect
                  label="음력 일"
                  options={lunarDayOptions()}
                  value={selectedLunarDay()}
                  onChange={setDay}
                />
              </Show>
            </div>
            <PSwitch label="윤달" checked={leap()} onChange={setLeap} />
          </>
        }
      >
        <PDatePicker
          label="양력 날짜"
          value={solar()}
          min="1900-01-01"
          max="2050-12-31"
          onChange={setSolar}
        />
      </Show>
      <Show
        when={result()}
        fallback={
          <p role="status" class="text-sm text-muted-foreground">
            {fallbackMessage()}
          </p>
        }
      >
        {(value) => (
          <Result label={direction() === 'solar' ? '음력 날짜' : '양력 날짜'} value={value()} />
        )}
      </Show>
      <p class="m-0 text-sm leading-6 text-muted-foreground">
        양력 1900~2050년을 지원합니다. 음력 2050년은 11월 18일까지 변환할 수 있습니다. 한국 음력
        기준이며 윤달 여부를 구분합니다.
      </p>
    </div>
  )
}
