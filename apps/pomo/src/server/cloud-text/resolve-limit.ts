import {CLOUD_TEXT_DAILY_LIMIT} from 'src/features/cloud-text/contracts'

interface ResolveCloudTextLimitOptions {
  readonly override?: number | null
  readonly productLimits: ReadonlyArray<number | null>
}

/** Resolves administrator overrides before the strongest product grant or the free default. */
export const resolveCloudTextLimit = (options: ResolveCloudTextLimitOptions): number | null => {
  if (options.override !== undefined) {
    return options.override
  }
  if (options.productLimits.includes(null)) {
    return null
  }
  const limits = options.productLimits.filter((limit) => limit !== null)
  return limits.length === 0 ? CLOUD_TEXT_DAILY_LIMIT : Math.max(...limits)
}
