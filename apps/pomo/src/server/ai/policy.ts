import type {AiCapability} from './model-catalog.ts'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_DOWNLOAD = 10
const MONTHS_PER_YEAR = 12
const DAYS_IN_MONTH_INDEX_OFFSET = 1
const DATE_KEY_LENGTH = 10
const DAYS_PER_RETENTION_PERIOD = {
  operationalRecord: 90,
  temporary: 1,
  unsavedResult: 7,
} as const
const APPROXIMATE_TOKEN_CHARACTERS = 4
const MAXIMUM_CREDITS = 2_147_483_647

export const AI_OPERATIONAL_LIMITS = {
  mediaRunningJobsPerUser: 1,
  runnerInferenceConcurrency: 1,
  urlTtlSeconds: MINUTES_PER_DOWNLOAD * SECONDS_PER_MINUTE,
  userRunningJobs: 2,
} as const

export type AiArtifactRetentionClass =
  | 'operational-record'
  | 'saved-result'
  | 'temporary'
  | 'unsaved-result'

export interface AiCreditProfile {
  readonly imagePixels?: number
  readonly imageStep?: number
  readonly soundDuration?: number
  readonly soundStep?: number
  readonly speechToTextDuration?: number
  readonly textInputToken?: number
  readonly textOutputToken?: number
  readonly textToSpeechDuration?: number
}

export type AiCreditBasis = Readonly<Record<string, number | null>>

export interface AiCreditEstimate {
  readonly basis: AiCreditBasis
  readonly credits: number | null
  readonly pricingConfigured: boolean
}

export interface SubscriptionUsagePeriod {
  readonly end: string
  readonly start: string
}

const addMonthsWithClampedDay = (dateValue: Date, months: number): Date => {
  const monthIndex = dateValue.getUTCMonth() + months
  const year = dateValue.getUTCFullYear() + Math.floor(monthIndex / MONTHS_PER_YEAR)
  const month = ((monthIndex % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR
  const day = Math.min(
    dateValue.getUTCDate(),
    new Date(Date.UTC(year, month + DAYS_IN_MONTH_INDEX_OFFSET, 0)).getUTCDate(),
  )

  return new Date(Date.UTC(year, month, day))
}

const toDateKey = (dateValue: Date): string => dateValue.toISOString().slice(0, DATE_KEY_LENGTH)

const getInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null

const getTextInputTokens = (input: Readonly<Record<string, unknown>>): number => {
  const messages = Array.isArray(input.messages) ? input.messages : []
  const characterCount = messages.reduce((total, message) => {
    if (typeof message !== 'object' || message === null || !('content' in message)) {
      return total
    }

    const {content} = message
    return total + (typeof content === 'string' ? content.length : 0)
  }, 0)

  return Math.max(1, Math.ceil(characterCount / APPROXIMATE_TOKEN_CHARACTERS))
}

const getParameters = (
  input: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> =>
  typeof input.parameters === 'object' && input.parameters !== null
    ? (input.parameters as Readonly<Record<string, unknown>>)
    : {}

interface CreditTerm {
  readonly scale: number
  readonly units: bigint
}

const createCreditTerm = (value: number, rate: number): CreditTerm => {
  const [coefficient = '0', exponent = '0'] = rate.toString().split('e')
  const fractionLength = coefficient.split('.')[1]?.length ?? 0
  const scale = fractionLength - Number(exponent)
  const units = BigInt(value) * BigInt(coefficient.replace('.', ''))
  return scale < 0 ? {scale: 0, units: units * 10n ** BigInt(-scale)} : {scale, units}
}

const calculateCredits = (values: ReadonlyArray<[number | null, number | null]>): number | null => {
  if (
    values.some(
      ([value, rate]) =>
        value === null ||
        rate === null ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        !Number.isFinite(rate) ||
        rate < 0,
    )
  ) {
    return null
  }

  // Decimal rates must not reserve an extra credit because of binary floating-point residue.
  const terms = values.map(([value, rate]) => createCreditTerm(value ?? 0, rate ?? 0))
  const scale = Math.max(0, ...terms.map((term) => term.scale))
  const divisor = 10n ** BigInt(scale)
  const total = terms.reduce(
    (sum, term) => sum + term.units * 10n ** BigInt(scale - term.scale),
    0n,
  )
  const credits = (total + divisor - 1n) / divisor
  return credits <= BigInt(MAXIMUM_CREDITS) ? Number(credits) : null
}

/** Returns the subscription-renewal anchored usage period for one entitlement. */
export const getSubscriptionUsagePeriod = (
  subscriptionStartsAt: Date,
  now: Date,
  subscriptionEndsAt?: Date | null,
): SubscriptionUsagePeriod => {
  if (now < subscriptionStartsAt) {
    throw new RangeError('Usage period cannot precede the subscription start')
  }

  let monthOffset = 0
  while (addMonthsWithClampedDay(subscriptionStartsAt, monthOffset + 1) <= now) {
    monthOffset += 1
  }

  const start = addMonthsWithClampedDay(subscriptionStartsAt, monthOffset)
  const nextRenewal = addMonthsWithClampedDay(subscriptionStartsAt, monthOffset + 1)
  const entitlementEnd = subscriptionEndsAt ?? nextRenewal
  const end = entitlementEnd < nextRenewal ? entitlementEnd : nextRenewal

  return {end: toDateKey(end), start: toDateKey(start)}
}

const getTextCreditEstimate = (
  input: Readonly<Record<string, unknown>>,
  profile?: AiCreditProfile,
): AiCreditEstimate => {
  const parameters = getParameters(input)
  const inputTokens = getTextInputTokens(input)
  const outputTokensCap = getInteger(parameters.maximumTokens)
  return {
    basis: {inputTokens, outputTokensCap},
    credits: calculateCredits([
      [inputTokens, profile?.textInputToken ?? null],
      [outputTokensCap, profile?.textOutputToken ?? null],
    ]),
    pricingConfigured:
      profile?.textInputToken !== undefined && profile.textOutputToken !== undefined,
  }
}

const getDurationCreditEstimate = (
  input: Readonly<Record<string, unknown>>,
  rate: number | undefined,
): AiCreditEstimate => {
  const durationSeconds = getInteger(input.durationSeconds)
  return {
    basis: {durationSeconds},
    credits: calculateCredits([[durationSeconds, rate ?? null]]),
    pricingConfigured: rate !== undefined,
  }
}

const getImageCreditEstimate = (
  input: Readonly<Record<string, unknown>>,
  profile?: AiCreditProfile,
): AiCreditEstimate => {
  const width = getInteger(input.width)
  const height = getInteger(input.height)
  const steps = getInteger(input.steps)
  const pixels = width === null || height === null ? null : width * height
  return {
    basis: {pixels, steps},
    credits: calculateCredits([
      [pixels, profile?.imagePixels ?? null],
      [steps, profile?.imageStep ?? null],
    ]),
    pricingConfigured: profile?.imagePixels !== undefined && profile.imageStep !== undefined,
  }
}

const getSoundCreditEstimate = (
  input: Readonly<Record<string, unknown>>,
  profile?: AiCreditProfile,
): AiCreditEstimate => {
  const durationSeconds = getInteger(input.durationSeconds)
  const steps = getInteger(input.steps)
  return {
    basis: {durationSeconds, steps},
    credits: calculateCredits([
      [durationSeconds, profile?.soundDuration ?? null],
      [steps, profile?.soundStep ?? null],
    ]),
    pricingConfigured: profile?.soundDuration !== undefined && profile.soundStep !== undefined,
  }
}

/** Computes a feature-specific pre-run estimate without assigning unconfigured rates. */
export const getAiCreditEstimate = (
  capability: AiCapability,
  input: Readonly<Record<string, unknown>>,
  profile?: AiCreditProfile,
): AiCreditEstimate => {
  switch (capability) {
    case 'text':
      return getTextCreditEstimate(input, profile)
    case 'speech-to-text':
      return getDurationCreditEstimate(input, profile?.speechToTextDuration)
    case 'text-to-speech':
      return getDurationCreditEstimate(input, profile?.textToSpeechDuration)
    case 'image':
      return getImageCreditEstimate(input, profile)
    case 'sound':
      return getSoundCreditEstimate(input, profile)
  }
}

/** Returns the retention deadline for a generated object or operational record. */
export const getAiArtifactRetention = (
  retentionClass: AiArtifactRetentionClass,
  createdAt: Date,
): Date | null => {
  if (retentionClass === 'saved-result') {
    return null
  }

  const days =
    retentionClass === 'temporary'
      ? DAYS_PER_RETENTION_PERIOD.temporary
      : retentionClass === 'unsaved-result'
        ? DAYS_PER_RETENTION_PERIOD.unsavedResult
        : DAYS_PER_RETENTION_PERIOD.operationalRecord
  const expiresAt = new Date(createdAt)
  expiresAt.setUTCDate(expiresAt.getUTCDate() + days)
  return expiresAt
}

/** Returns the short-lived lifetime for an authenticated artifact download URL. */
export const getAiDownloadExpiry = (now: Date): Date =>
  new Date(now.getTime() + AI_OPERATIONAL_LIMITS.urlTtlSeconds * MILLISECONDS_PER_SECOND)
