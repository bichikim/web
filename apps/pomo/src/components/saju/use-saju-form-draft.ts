import {createMemo, createSignal, onMount} from 'solid-js'
import {daysInMonth} from 'src/features/civil-date'
import type {SajuFormDraft, SajuFormDraftPersistence} from 'src/features/saju/form-draft-storage'
import {getConvertibleLunarDays} from 'src/features/tools'

interface UseSajuFormDraftInput {
  readonly initialDate: string
  readonly persistence?: SajuFormDraftPersistence
}

function getCalendarDays(input: {
  readonly calendar: 'solar' | 'lunar'
  readonly leap: boolean
  readonly month: number
  readonly year: number
}): ReadonlyArray<number> {
  return input.calendar === 'solar'
    ? Array.from({length: daysInMonth(input.year, input.month)}, (_, index) => index + 1)
    : getConvertibleLunarDays({leap: input.leap, month: input.month, year: input.year})
}

function createInitialDraft(initialDate: string): SajuFormDraft {
  const [year = '', month = '', day = ''] = initialDate.split('-')
  const selectedMonth = String(Number(month) || '')
  const selectedDay = String(Number(day) || '')
  return {
    calendar: 'solar',
    gender: 'M',
    leapMonth: false,
    lunarDay: selectedDay,
    lunarMonth: selectedMonth,
    lunarYear: year,
    question: '',
    solarDay: selectedDay,
    solarMonth: selectedMonth,
    solarYear: year,
    time: '',
    version: 1,
  }
}

export function useSajuFormDraft(input: UseSajuFormDraftInput) {
  const [draft, setDraft] = createSignal(createInitialDraft(input.initialDate))
  onMount(() => {
    const saved = input.persistence?.read()
    if (saved !== null && saved !== undefined) {
      setDraft(saved)
    }
  })
  const updateDraft = (change: Partial<SajuFormDraft>) => {
    const next = {...draft(), ...change}
    setDraft(next)
    input.persistence?.write(next)
  }
  const calendar = createMemo(() => draft().calendar)
  const gender = createMemo(() => draft().gender)
  const leapMonth = createMemo(() => draft().leapMonth)
  const question = createMemo(() => draft().question)
  const time = createMemo(() => draft().time)
  const dateYear = createMemo(() => {
    const current = draft()
    return current.calendar === 'solar' ? current.solarYear : current.lunarYear
  })
  const dateMonth = createMemo(() => {
    const current = draft()
    return current.calendar === 'solar' ? current.solarMonth : current.lunarMonth
  })
  const dateDay = createMemo(() => {
    const current = draft()
    return current.calendar === 'solar' ? current.solarDay : current.lunarDay
  })
  const calendarLabel = createMemo(() => (calendar() === 'solar' ? '양력' : '음력'))
  const dayOptions = createMemo(() => {
    const year = Number(dateYear())
    const month = Number(dateMonth())
    if (!year || !month) {
      return []
    }
    const days = getCalendarDays({
      calendar: calendar(),
      leap: leapMonth(),
      month,
      year,
    })
    if (days.length === 0) {
      return []
    }
    const options = days.map((day) => ({label: String(day), value: String(day)}))
    return input.initialDate === '' ? [{label: '일 선택', value: ''}, ...options] : options
  })
  const selectedDay = createMemo(() => {
    const options = dayOptions()
    return (
      options.find((option) => option.value === dateDay())?.value ??
      (input.initialDate === '' ? '' : (options.at(-1)?.value ?? ''))
    )
  })
  const changeYear = (value: string) =>
    updateDraft(draft().calendar === 'solar' ? {solarYear: value} : {lunarYear: value})
  const changeMonth = (value: string) =>
    updateDraft(draft().calendar === 'solar' ? {solarMonth: value} : {lunarMonth: value})
  const changeDay = (value: string) =>
    updateDraft(draft().calendar === 'solar' ? {solarDay: value} : {lunarDay: value})
  const resetDraft = () => {
    setDraft(createInitialDraft(input.initialDate))
    input.persistence?.delete()
  }

  return {
    calendar,
    calendarLabel,
    changeDay,
    changeMonth,
    changeYear,
    dateMonth,
    dateYear,
    dayOptions,
    draft,
    gender,
    leapMonth,
    question,
    resetDraft,
    selectedDay,
    time,
    updateDraft,
  }
}
