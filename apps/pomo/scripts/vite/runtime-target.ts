const POMO_RUNTIME_TARGETS = ['web', 'apps-in-toss', 'desktop', 'android', 'ios'] as const
export type PomoTarget = (typeof POMO_RUNTIME_TARGETS)[number]
const POMO_BUILD_TARGETS = ['web', 'apps-in-toss', 'desktop', 'android', 'ios'] as const
type PomoBuildTarget = (typeof POMO_BUILD_TARGETS)[number]

const isPomoRuntimeTarget = (value: string): value is PomoTarget =>
  POMO_RUNTIME_TARGETS.includes(value as PomoTarget)

const isPomoBuildTarget = (value: string): value is PomoBuildTarget =>
  POMO_BUILD_TARGETS.includes(value as PomoBuildTarget)

export const resolveRuntimeTarget = (
  buildTarget: string | undefined,
  runtimeTarget: string | undefined,
): PomoTarget => {
  if (runtimeTarget !== undefined && !isPomoRuntimeTarget(runtimeTarget)) {
    throw new Error(
      `Unsupported POMO_RUNTIME_TARGET: ${runtimeTarget}. Use web, apps-in-toss, desktop, android, or ios.`,
    )
  }

  if (buildTarget !== undefined && !isPomoBuildTarget(buildTarget)) {
    throw new Error(
      `Unsupported POMO_BUILD_TARGET: ${buildTarget}. Use web, apps-in-toss, desktop, android, or ios.`,
    )
  }

  if (buildTarget !== undefined && runtimeTarget !== undefined && buildTarget !== runtimeTarget) {
    throw new Error(
      `POMO_BUILD_TARGET=${buildTarget} requires POMO_RUNTIME_TARGET=${buildTarget} when both targets are provided.`,
    )
  }

  const isMobileBuild = buildTarget === 'android' || buildTarget === 'ios'
  if (isMobileBuild && runtimeTarget === undefined) {
    throw new Error(`POMO_BUILD_TARGET=${buildTarget} requires POMO_RUNTIME_TARGET=${buildTarget}.`)
  }

  if (runtimeTarget !== undefined) {
    return runtimeTarget
  }

  if (buildTarget === 'apps-in-toss' || buildTarget === 'desktop') {
    return buildTarget
  }

  return 'web'
}
