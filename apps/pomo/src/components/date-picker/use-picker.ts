import {createMemo, createSignal} from 'solid-js'
import {
  addDays,
  type CivilDate,
  dateEpoch,
  daysInMonth,
  formatDate,
  parseDate,
} from 'src/features/civil-date'

const LAST_WEEKDAY = 6
const WEEK_DAYS = 7
const PREVIOUS_WEEK = -7

export interface UsePickerProps {
  readonly value?: string
  readonly min?: string
  readonly max?: string
  readonly disabled?: boolean
  readonly onChange?: (value: string) => void
}
export const usePicker = (props: UsePickerProps) => {
  const [local, setLocal] = createSignal('')
  const [open, setOpen] = createSignal(false)
  const [view, setView] = createSignal<CivilDate>({day: 1, month: 1, year: 2026})
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)
  const [panel, setPanel] = createSignal<HTMLDivElement | null>(null)
  const value = () => props.value ?? local()
  const minimum = () => props.min ?? '1900-01-01'
  const maximum = () => props.max ?? '2100-12-31'
  const allowed = (date: string) => date >= minimum() && date <= maximum()
  const clamp = (date: CivilDate) =>
    parseDate(
      formatDate(date) < minimum()
        ? minimum()
        : formatDate(date) > maximum()
          ? maximum()
          : formatDate(date),
    ) ?? date
  const close = () => {
    setOpen(false)
    trigger()?.focus()
  }
  const select = (date: string) => {
    if (props.disabled || (date !== '' && !allowed(date))) {
      return
    }
    setLocal(date)
    props.onChange?.(date)
    close()
  }
  const focus = (date: CivilDate) => {
    const next = clamp(date)
    setView(next)
    panel()
      ?.querySelector<HTMLButtonElement>(`[data-date="${formatDate(next)}"]`)
      ?.focus()
  }
  const changeMonth = (year: number, month: number) =>
    setView(clamp({day: Math.min(view().day, daysInMonth(year, month)), month, year}))
  const moveMonth = (count: number) => {
    const current = view()
    const date = new Date(Date.UTC(current.year, current.month - 1 + count, 1))
    changeMonth(date.getUTCFullYear(), date.getUTCMonth() + 1)
  }
  const toggle = () => {
    if (open()) {
      close()
      return
    }
    const now = new Date()
    setView(
      clamp(
        parseDate(value()) ?? {
          day: now.getDate(),
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      ),
    )
    setOpen(true)
    focus(view())
  }
  const onKeyDown = (event: KeyboardEvent, date: CivilDate) => {
    const weekday = new Date(dateEpoch(date)).getUTCDay()
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        focus(addDays(date, -1))
        return
      case 'ArrowRight':
        event.preventDefault()
        focus(addDays(date, 1))
        return
      case 'ArrowUp':
        event.preventDefault()
        focus(addDays(date, PREVIOUS_WEEK))
        return
      case 'ArrowDown':
        event.preventDefault()
        focus(addDays(date, WEEK_DAYS))
        return
      case 'Home':
        event.preventDefault()
        focus(addDays(date, -weekday))
        return
      case 'End':
        event.preventDefault()
        focus(addDays(date, LAST_WEEKDAY - weekday))
        return
      case 'PageUp':
        event.preventDefault()
        moveMonth(-1)
        focus(view())
        return
      case 'PageDown':
        event.preventDefault()
        moveMonth(1)
        focus(view())
        break
      default:
        break
    }
  }
  const onPanelKeyDown = (event: KeyboardEvent) => {
    if (
      event.key === 'Escape' &&
      !event.defaultPrevented &&
      event.target instanceof Node &&
      panel()?.contains(event.target)
    ) {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }
  const cells = createMemo(() => {
    const current = view()
    const offset = new Date(Date.UTC(current.year, current.month - 1, 1)).getUTCDay()
    return Array.from({length: offset + daysInMonth(current.year, current.month)}, (_, index) =>
      index < offset ? null : {day: index - offset + 1, month: current.month, year: current.year},
    )
  })
  return {
    allowed,
    cells,
    changeMonth,
    maximum,
    minimum,
    moveMonth,
    onKeyDown,
    onPanelKeyDown,
    open,
    select,
    setPanel,
    setTrigger,
    toggle,
    value,
    view,
  }
}
