import type {PomoTarget} from './runtime-target'

const POMO_DISTRIBUTION_TARGETS = ['default', 'steam'] as const
export type PomoDistributionTarget = (typeof POMO_DISTRIBUTION_TARGETS)[number]

const isPomoDistributionTarget = (value: string): value is PomoDistributionTarget =>
  POMO_DISTRIBUTION_TARGETS.includes(value as PomoDistributionTarget)

/** Resolves the release distribution without changing the desktop runtime target. */
export const resolveDistributionTarget = (
  runtimeTarget: PomoTarget,
  distributionTarget: string | undefined,
): PomoDistributionTarget => {
  const target = distributionTarget ?? 'default'

  if (!isPomoDistributionTarget(target)) {
    throw new Error(`Unsupported POMO_DISTRIBUTION_TARGET: ${target}. Use default or steam.`)
  }

  if (target === 'steam' && runtimeTarget !== 'desktop') {
    throw new Error('POMO_DISTRIBUTION_TARGET=steam requires POMO_RUNTIME_TARGET=desktop.')
  }

  return target
}
