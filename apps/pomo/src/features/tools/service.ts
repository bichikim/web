import {addDays, dateEpoch, formatDate, parseDate, periodEnd} from '../civil-date'

const PERCENT_SCALE = 100
const DAY_MILLISECONDS = 86400000
export type ServiceBranch = 'army' | 'marines' | 'navy' | 'air'
const SERVICE_MONTHS = {air: 21, army: 18, marines: 18, navy: 20} as const
export interface CalculateServiceOptions {
  readonly start: string
  readonly branch: ServiceBranch
  readonly today: string
  readonly days?: number
}
export interface ServiceResult {
  readonly end: string
  readonly remaining: number
  readonly total: number
  readonly progress: number
}
export const calculateService = (options: CalculateServiceOptions): ServiceResult | null => {
  const start = parseDate(options.start)
  const today = parseDate(options.today)
  if (start === null || today === null) {
    return null
  }
  if (options.days === undefined && options.start < '2022-01-01') {
    return null
  }
  if (options.days !== undefined && (!Number.isSafeInteger(options.days) || options.days < 1)) {
    return null
  }
  const end =
    options.days === undefined
      ? periodEnd(start, SERVICE_MONTHS[options.branch])
      : addDays(start, options.days - 1)
  if (parseDate(formatDate(end)) === null || dateEpoch(end) < dateEpoch(start)) {
    return null
  }
  const total = (dateEpoch(end) - dateEpoch(start)) / DAY_MILLISECONDS + 1
  const elapsed = (dateEpoch(today) - dateEpoch(start)) / DAY_MILLISECONDS
  const remaining = Math.max(0, (dateEpoch(end) - dateEpoch(today)) / DAY_MILLISECONDS)
  return {
    end: formatDate(end),
    progress: Math.min(PERCENT_SCALE, Math.max(0, (elapsed / total) * PERCENT_SCALE)),
    remaining,
    total,
  }
}
