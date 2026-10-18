import {expect, it} from 'vitest'

import {resolveRuntimeTarget} from '../runtime-target'

it.each(['web', 'apps-in-toss', 'desktop', 'android', 'ios'] as const)(
  'should accept %s as an explicit runtime and as matching build inputs',
  (target) => {
    expect(resolveRuntimeTarget(undefined, target)).toBe(target)
    expect(resolveRuntimeTarget(target, target)).toBe(target)
  },
)

it.each([
  [undefined, 'web'],
  ['web', 'web'],
  ['apps-in-toss', 'apps-in-toss'],
  ['desktop', 'desktop'],
] as const)('should resolve build %s without an explicit runtime to %s', (build, expected) => {
  expect(resolveRuntimeTarget(build, undefined)).toBe(expected)
})

it.each(['android', 'ios'] as const)(
  'should require an explicit runtime for a %s build',
  (target) => {
    expect(() => resolveRuntimeTarget(target, undefined)).toThrow(
      new Error(`POMO_BUILD_TARGET=${target} requires POMO_RUNTIME_TARGET=${target}.`),
    )
  },
)

it.each(['', 'WEB', ' web', 'web ', 'mobile', 'steam'])(
  'should preserve input-specific errors for unsupported target %j',
  (target) => {
    expect(() => resolveRuntimeTarget(undefined, target)).toThrow(
      new Error(
        `Unsupported POMO_RUNTIME_TARGET: ${target}. Use web, apps-in-toss, desktop, android, or ios.`,
      ),
    )
    expect(() => resolveRuntimeTarget(target, undefined)).toThrow(
      new Error(
        `Unsupported POMO_BUILD_TARGET: ${target}. Use web, apps-in-toss, desktop, android, or ios.`,
      ),
    )
  },
)

it('should validate the runtime before an invalid build input', () => {
  expect(() => resolveRuntimeTarget('invalid-build', 'invalid-runtime')).toThrow(
    new Error(
      'Unsupported POMO_RUNTIME_TARGET: invalid-runtime. Use web, apps-in-toss, desktop, android, or ios.',
    ),
  )
})

it('should validate the build before checking target agreement', () => {
  expect(() => resolveRuntimeTarget('invalid-build', 'android')).toThrow(
    new Error(
      'Unsupported POMO_BUILD_TARGET: invalid-build. Use web, apps-in-toss, desktop, android, or ios.',
    ),
  )
})

it.each([
  ['web', 'desktop'],
  ['desktop', 'web'],
  ['android', 'ios'],
  ['ios', 'android'],
] as const)('should reject mismatched %s build and %s runtime inputs', (build, runtime) => {
  expect(() => resolveRuntimeTarget(build, runtime)).toThrow(
    new Error(
      `POMO_BUILD_TARGET=${build} requires POMO_RUNTIME_TARGET=${build} when both targets are provided.`,
    ),
  )
})
