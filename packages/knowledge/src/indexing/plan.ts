export interface UnitDigest {
  readonly contentHash: string
  readonly pointId: string
}

export interface CreateIndexPlanOptions {
  readonly indexed: ReadonlyArray<UnitDigest>
  readonly source: ReadonlyArray<UnitDigest>
}

export interface IndexPlan {
  readonly add: ReadonlyArray<UnitDigest>
  readonly delete: ReadonlyArray<UnitDigest>
  readonly unchanged: ReadonlyArray<UnitDigest>
  readonly update: ReadonlyArray<UnitDigest>
}

export interface DuplicatePointIdError {
  readonly code: 'duplicate-point-id'
  readonly pointId: string
}

export interface CreateIndexPlanFailure {
  readonly error: DuplicatePointIdError
  readonly ok: false
}

export interface CreateIndexPlanSuccess {
  readonly ok: true
  readonly value: IndexPlan
}

export type CreateIndexPlanResult = CreateIndexPlanFailure | CreateIndexPlanSuccess

interface DigestMapSuccess {
  readonly ok: true
  readonly value: ReadonlyMap<string, UnitDigest>
}

type DigestMapResult = CreateIndexPlanFailure | DigestMapSuccess

const duplicateFailure = (pointId: string): CreateIndexPlanFailure => ({
  error: {
    code: 'duplicate-point-id',
    pointId,
  },
  ok: false,
})

const createDigestMap = (digests: ReadonlyArray<UnitDigest>): DigestMapResult => {
  const digestMap = new Map<string, UnitDigest>()

  for (const digest of digests) {
    if (digestMap.has(digest.pointId)) {
      return duplicateFailure(digest.pointId)
    }

    digestMap.set(digest.pointId, digest)
  }

  return {
    ok: true,
    value: digestMap,
  }
}

const sortDigests = (digests: ReadonlyArray<UnitDigest>): ReadonlyArray<UnitDigest> =>
  digests.toSorted((left, right) => left.pointId.localeCompare(right.pointId))

export const createIndexPlan = (options: CreateIndexPlanOptions): CreateIndexPlanResult => {
  const sourceResult = createDigestMap(options.source)

  if (!sourceResult.ok) {
    return sourceResult
  }

  const indexedResult = createDigestMap(options.indexed)

  if (!indexedResult.ok) {
    return indexedResult
  }

  const add: UnitDigest[] = []
  const unchanged: UnitDigest[] = []
  const update: UnitDigest[] = []

  for (const sourceDigest of sourceResult.value.values()) {
    const indexedDigest = indexedResult.value.get(sourceDigest.pointId)

    if (indexedDigest === undefined) {
      add.push(sourceDigest)
    } else if (indexedDigest.contentHash === sourceDigest.contentHash) {
      unchanged.push(sourceDigest)
    } else {
      update.push(sourceDigest)
    }
  }

  const deleted = [...indexedResult.value.values()].filter(
    (indexedDigest) => !sourceResult.value.has(indexedDigest.pointId),
  )

  return {
    ok: true,
    value: {
      add: sortDigests(add),
      delete: sortDigests(deleted),
      unchanged: sortDigests(unchanged),
      update: sortDigests(update),
    },
  }
}
