import {createMemo, createSignal, onCleanup, onMount} from 'solid-js'
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

const getDraftSnapshot = (draft: SajuFormDraft | null): string | null =>
  draft === null ? null : JSON.stringify(draft)

export function useSajuFormDraft(input: UseSajuFormDraftInput) {
  const [draft, setDraft] = createSignal(createInitialDraft(input.initialDate))
  let storageSnapshot: string | null = null
  onMount(() => {
    const {persistence} = input
    if (persistence === undefined) {
      return
    }
    const restore = () => {
      const saved = persistence.read()
      const snapshot = getDraftSnapshot(saved)
      if (snapshot !== storageSnapshot) {
        storageSnapshot = snapshot
        setDraft(saved ?? createInitialDraft(input.initialDate))
      }
    }
    const unsubscribe = persistence.subscribe?.(restore)
    if (unsubscribe !== undefined) {
      onCleanup(unsubscribe)
    }
    restore()
  })
  const patchDraft = (change: (current: SajuFormDraft) => Partial<SajuFormDraft>) => {
    const {persistence} = input
    const subscribed = persistence?.subscribe !== undefined
    const latest = subscribed ? persistence.read() : null
    const snapshot = getDraftSnapshot(latest)
    // Retain local edits if the last persistence attempt failed and storage is unchanged.
    const current = snapshot !== storageSnapshot && latest !== null ? latest : draft()
    storageSnapshot = snapshot
    const next = {...current, ...change(current)}
    setDraft(next)
    persistence?.write(next)
    if (subscribed) {
      const expected = getDraftSnapshot(next)
      if (getDraftSnapshot(persistence.read()) === expected) {
        storageSnapshot = expected
      }
    }
  }
  const updateDraft = (change: Partial<SajuFormDraft>) => patchDraft(() => change)
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
    patchDraft((current) =>
      current.calendar === 'solar' ? {solarYear: value} : {lunarYear: value},
    )
  const changeMonth = (value: string) =>
    patchDraft((current) =>
      current.calendar === 'solar' ? {solarMonth: value} : {lunarMonth: value},
    )
  const changeDay = (value: string) =>
    patchDraft((current) => (current.calendar === 'solar' ? {solarDay: value} : {lunarDay: value}))
  const resetDraft = () => {
    setDraft(createInitialDraft(input.initialDate))
    input.persistence?.delete()
    storageSnapshot = getDraftSnapshot(input.persistence?.read() ?? null)
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
