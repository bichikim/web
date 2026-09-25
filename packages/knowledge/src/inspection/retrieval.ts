import type {
  KnowledgeIndexSearchResult,
  KnowledgeScope,
  StoredKnowledgePoint,
} from '../indexing/store'
import type {InspectionFailure, InspectionPair, PairSelection} from './pairs'

export interface FindKnowledgeNeighborsOptions {
  readonly source: StoredKnowledgePoint
  readonly limit: number
}
export interface KnowledgeNeighborReader {
  readonly findNeighbors: (
    options: FindKnowledgeNeighborsOptions,
  ) => Promise<KnowledgeIndexSearchResult>
}
export interface InspectionRetrieval {
  readonly candidatePairs: number
  readonly errors: ReadonlyArray<{readonly pointId: string; readonly code: string}>
  readonly neighborsPerUnit: number
  readonly seedLimit: number
}
export interface RetrievedPairSelection extends PairSelection {
  readonly retrieval: InspectionRetrieval
}
export interface RetrieveInspectionPairsOptions extends KnowledgeScope {
  readonly points: ReadonlyArray<StoredKnowledgePoint>
  readonly reader: KnowledgeNeighborReader
  readonly limit: number
}
export interface RetrievedPairsSuccess {
  readonly ok: true
  readonly value: RetrievedPairSelection
}
export type RetrieveInspectionPairsResult = RetrievedPairsSuccess | InspectionFailure
interface ScoredPair {
  readonly pair: InspectionPair
  readonly key: string
  readonly score: number
}

export interface MatchesInspectionSourceOptions {
  readonly actual: StoredKnowledgePoint
  readonly expected: StoredKnowledgePoint
}
/** Matches the identity and classifier input of an active indexed source snapshot. */
export const matchesInspectionSource = (options: MatchesInspectionSourceOptions): boolean => {
  const {actual, expected} = options
  return (
    actual.pointId === expected.pointId &&
    actual.payload.status === 'active' &&
    expected.payload.status === 'active' &&
    actual.payload.repoId === expected.payload.repoId &&
    actual.payload.workspaceId === expected.payload.workspaceId &&
    actual.payload.contentHash === expected.payload.contentHash &&
    actual.payload.docId === expected.payload.docId &&
    actual.payload.unitId === expected.payload.unitId &&
    actual.payload.title === expected.payload.title &&
    actual.payload.text === expected.payload.text
  )
}

interface ReadCandidatePairsOptions extends FindKnowledgeNeighborsOptions {
  readonly reader: KnowledgeNeighborReader
  readonly snapshot: ReadonlyMap<string, StoredKnowledgePoint>
}
interface CandidatePairsSuccess {
  readonly ok: true
  readonly value: ReadonlyArray<ScoredPair>
}
const readCandidatePairs = async (
  options: ReadCandidatePairsOptions,
): Promise<CandidatePairsSuccess | InspectionFailure> => {
  const {source, limit, snapshot} = options
  const result = await options.reader.findNeighbors({limit, source})
  if (!result.ok) {
    return {error: {code: result.error.code}, ok: false}
  }
  const valid =
    result.value.length <= limit &&
    result.value.every((hit) => {
      const expected = snapshot.get(hit.pointId)
      return (
        Number.isFinite(hit.score) &&
        expected !== undefined &&
        matchesInspectionSource({actual: hit, expected})
      )
    })
  if (!valid) {
    return {error: {code: 'inspection-candidate-changed'}, ok: false}
  }
  return {
    ok: true,
    value: result.value
      .filter((hit) => hit.pointId !== source.pointId)
      .map((hit) => {
        const pair =
          source.pointId.localeCompare(hit.pointId) < 0
            ? {left: source, right: hit}
            : {left: hit, right: source}
        return {
          key: JSON.stringify([pair.left.pointId, pair.right.pointId]),
          pair,
          score: hit.score,
        }
      }),
  }
}

/** Retrieves bounded dense-neighbor candidates; errors and truncation do not imply corpus-wide absence. */
export const retrieveInspectionPairs = async (
  options: RetrieveInspectionPairsOptions,
): Promise<RetrieveInspectionPairsResult> => {
  const MAX_PAIRS = 100
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > MAX_PAIRS) {
    return {error: {code: 'invalid-inspection-limit'}, ok: false}
  }
  const SEED_LIMIT = 20
  const NEIGHBORS = 10
  const active = options.points
    .filter(
      ({payload}) =>
        payload.status === 'active' &&
        payload.repoId === options.repoId &&
        payload.workspaceId === options.workspaceId,
    )
    .toSorted((left, right) => left.pointId.localeCompare(right.pointId))
  const seeds = active.length < 2 ? [] : active.slice(0, SEED_LIMIT)
  const snapshot = new Map(active.map((point) => [point.pointId, point]))
  const candidates = new Map<string, ScoredPair>()
  const errors: Array<{readonly pointId: string; readonly code: string}> = []
  for (const source of seeds) {
    // Bound concurrent storage work independently of the local model budget.
    // eslint-disable-next-line no-await-in-loop
    const result = await readCandidatePairs({
      limit: NEIGHBORS,
      reader: options.reader,
      snapshot,
      source,
    })
    if (result.ok) {
      for (const candidate of result.value) {
        const previous = candidates.get(candidate.key)
        if (previous === undefined || candidate.score > previous.score) {
          candidates.set(candidate.key, candidate)
        }
      }
    } else {
      errors.push({code: result.error.code, pointId: source.pointId})
    }
  }
  const pairs = [...candidates.values()]
    .toSorted((left, right) => right.score - left.score || left.key.localeCompare(right.key))
    .slice(0, options.limit)
    .map(({pair}) => pair)
  const PAIR_DIVISOR = 2
  const totalPairs = (active.length * (active.length - 1)) / PAIR_DIVISOR
  return {
    ok: true,
    value: {
      consideredUnits: seeds.length,
      eligibleUnits: active.length,
      pairs,
      retrieval: {
        candidatePairs: candidates.size,
        errors,
        neighborsPerUnit: NEIGHBORS,
        seedLimit: SEED_LIMIT,
      },
      totalPairs,
      truncated: pairs.length < totalPairs,
    },
  }
}
