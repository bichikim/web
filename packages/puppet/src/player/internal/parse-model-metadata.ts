import {
  MAXIMUM_PUPPET_FRAMES_PER_SECOND,
  MINIMUM_PUPPET_FRAMES_PER_SECOND,
  PUPPET_VOWELS,
  type PuppetParameter,
} from '../document'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isIdList = (value: unknown, known: ReadonlySet<string>) =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every((id) => typeof id === 'string' && known.has(id)) &&
    new Set(value).size === value.length)

/** Eye-blink and lip-sync roles listing distinct known parameters. */
export const hasValidParameterRoles = (
  roles: unknown,
  parameters: ReadonlyArray<PuppetParameter>,
) => {
  if (roles === undefined) {
    return true
  }
  const known = new Set(parameters.map((parameter) => parameter.id))
  return isRecord(roles) && isIdList(roles.eyeBlink, known) && isIdList(roles.lipSync, known)
}

const isGroup = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  typeof value.name === 'string' &&
  value.name.length > 0 &&
  (value.groupId === undefined || typeof value.groupId === 'string')

/**
 * Parameter groups with unique IDs whose parents exist without cycles, and parameters naming
 * existing groups.
 */
export const hasValidParameterGroups = (
  groups: unknown,
  parameters: ReadonlyArray<PuppetParameter>,
) => {
  const list: ReadonlyArray<unknown> = Array.isArray(groups) ? groups : []
  if ((groups !== undefined && !Array.isArray(groups)) || !list.every(isGroup)) {
    return false
  }
  const parents = new Map(
    list.flatMap((group) =>
      isRecord(group) ? [[String(group.id), group.groupId as string | undefined] as const] : [],
    ),
  )
  // 루트에 닿는다고 확인된 그룹을 공유해 그룹마다 루트까지 다시 걷지 않는다(전체 O(G)).
  const rooted = new Set<string>()
  const reachesRoot = (id: string) => {
    const seen = new Set<string>()
    let current: string | undefined = id
    while (current !== undefined && !rooted.has(current)) {
      if (seen.has(current) || !parents.has(current)) {
        return false
      }
      seen.add(current)
      current = parents.get(current)
    }
    seen.forEach((seenId) => rooted.add(seenId))
    return true
  }
  return (
    parents.size === list.length &&
    [...parents.keys()].every(reachesRoot) &&
    parameters.every(
      (parameter) => parameter.groupId === undefined || parents.has(parameter.groupId),
    )
  )
}

/** A whole frame rate within the supported range, or none. */
export const isOptionalFramesPerSecond = (value: unknown) =>
  value === undefined ||
  (Number.isInteger(value) &&
    (value as number) >= MINIMUM_PUPPET_FRAMES_PER_SECOND &&
    (value as number) <= MAXIMUM_PUPPET_FRAMES_PER_SECOND)

const isFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isRatio = (value: unknown) => isFinite(value) && value >= 0 && value <= 1

/** A non-empty rectangle, aligned by ratios within 0..1. */
export const isOptionalLayout = (value: unknown) =>
  value === undefined ||
  (isRecord(value) &&
    isFinite(value.x) &&
    isFinite(value.y) &&
    isFinite(value.width) &&
    value.width > 0 &&
    isFinite(value.height) &&
    value.height > 0 &&
    (value.align === undefined ||
      (Array.isArray(value.align) && value.align.length === 2 && value.align.every(isRatio))))

/** Distinct known parameters with finite factors. */
export const hasValidLook = (value: unknown, parameters: ReadonlyArray<PuppetParameter>) =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every(
      (entry) => isRecord(entry) && isFinite(entry.x) && isFinite(entry.y) && isFinite(entry.xy),
    ) &&
    isIdList(
      value.map((entry: Record<string, unknown>) => entry.parameterId),
      new Set(parameters.map((parameter) => parameter.id)),
    ))

/** Distinct known parameters with finite settings and a positive period. */
export const hasValidBreath = (value: unknown, parameters: ReadonlyArray<PuppetParameter>) => {
  if (value === undefined) {
    return true
  }
  const known = new Set(parameters.map((parameter) => parameter.id))
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        isFinite(entry.offset) &&
        isFinite(entry.peak) &&
        isFinite(entry.period) &&
        entry.period > 0 &&
        isFinite(entry.weight),
    ) &&
    isIdList(
      value.map((entry: Record<string, unknown>) => entry.parameterId),
      known,
    )
  )
}

/** Distinct known parameters, one finite value for each per vowel, and a non-negative smoothing. */
export const hasValidMouthShapes = (value: unknown, parameters: ReadonlyArray<PuppetParameter>) => {
  if (value === undefined) {
    return true
  }
  if (!isRecord(value) || !isRecord(value.vowels)) {
    return false
  }
  const known = new Set(parameters.map((parameter) => parameter.id))
  const {parameterIds, smoothing, vowels} = value
  return (
    Array.isArray(parameterIds) &&
    parameterIds.length > 0 &&
    isIdList(parameterIds, known) &&
    (smoothing === undefined || (isFinite(smoothing) && smoothing >= 0)) &&
    PUPPET_VOWELS.every((vowel) => {
      const values = vowels[vowel]
      return (
        Array.isArray(values) && values.length === parameterIds.length && values.every(isFinite)
      )
    })
  )
}
