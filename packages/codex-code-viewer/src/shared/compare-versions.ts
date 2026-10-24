import {versionSchema} from './plugin-updates'

const compareIdentifiers = (left: string, right: string): number => {
  const leftNumeric = /^\d+$/u.test(left)
  const rightNumeric = /^\d+$/u.test(right)
  if (leftNumeric && rightNumeric) {
    return BigInt(left) > BigInt(right) ? 1 : BigInt(left) < BigInt(right) ? -1 : 0
  }
  if (leftNumeric !== rightNumeric) {
    return leftNumeric ? -1 : 1
  }
  return left > right ? 1 : left < right ? -1 : 0
}
const compareParts = (left: readonly string[], right: readonly string[]): number => {
  for (const [index, part] of left.entries()) {
    const other = right[index]
    if (other === undefined) {
      return 1
    }
    const comparison = compareIdentifiers(part, other)
    if (comparison !== 0) {
      return comparison
    }
  }
  return left.length < right.length ? -1 : 0
}
const parseVersion = (version: string) => {
  const [precedence = ''] = versionSchema.parse(version).split('+')
  const [core = '', ...prerelease] = precedence.split('-')
  return {
    core: core.split('.'),
    prerelease: prerelease.length === 0 ? undefined : prerelease.join('-').split('.'),
  }
}

/** SemVer 우선순위로 비교하며 빌드 메타데이터는 무시한다. */
export const compareVersions = (left: string, right: string): number => {
  const first = parseVersion(left)
  const second = parseVersion(right)
  const core = compareParts(first.core, second.core)
  if (core !== 0) {
    return core
  }
  if (first.prerelease === undefined || second.prerelease === undefined) {
    return first.prerelease === second.prerelease ? 0 : first.prerelease === undefined ? 1 : -1
  }
  return compareParts(first.prerelease, second.prerelease)
}
