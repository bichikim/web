import {lstat, mkdir} from 'node:fs/promises'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {z} from 'zod'
import {classifyInspectionPair} from '../adapters/inspection'
import {
  classifyContextualPair,
  classifyResearchPair,
  classifySeparatedPair,
} from '../adapters/experimental/index'
import type {StoredKnowledgePoint} from '../indexing/store'
import {resolveQuestionModel} from '../adapters/questions'
import {
  type Assessment,
  type AssessmentResult,
  collectInspectionContext,
  type ContextReview,
  CONTEXTUAL_INSPECTION_VERSION,
  contextualKey,
  type ContextualResult,
  INSPECTION_PROMPT_VERSION,
  inspectionKey,
  type InspectionMode,
  type InspectionModel,
  type InspectionPair,
  type InspectionRetrieval,
  parseAssessment,
  parseContextualReview,
  RESEARCH_INSPECTION_VERSION,
  type ResearchJournal,
  type ResearchReader,
  type ResearchResult,
  type ResearchReview,
  retrieveInspectionPairs,
  SEPARATED_INSPECTION_VERSION,
} from '../inspection/index'
import {readArtifact, writeArtifact} from './artifacts'
import {withKnowledgeLock} from './lock'
import {readInspectionJournal, readInspectionLinks, writeInspectionLinks} from './links'
import {loadInspectionSource} from './runtime'

export interface InspectionFinding {
  readonly research?: ResearchReview
  readonly assessment: Assessment
  readonly review?: ContextReview
  readonly cacheKey: string
  readonly left: {readonly contentHash: string; readonly docId: string; readonly unitId: string}
  readonly right: {readonly contentHash: string; readonly docId: string; readonly unitId: string}
}
export interface InspectionReport {
  readonly assessments: ReadonlyArray<InspectionFinding>
  readonly cached: number
  readonly consideredUnits: number
  readonly eligibleUnits: number
  readonly limit: number
  readonly sourceUnits: ReadonlyArray<{
    readonly docId: string
    readonly unitId: string
    readonly contentHash: string
  }>
  readonly errors: ReadonlyArray<{readonly cacheKey: string; readonly code: string}>
  readonly model?: InspectionModel
  readonly promptVersion: number
  readonly repoId: string
  readonly retrieval: InspectionRetrieval
  readonly selectedPairs: number
  readonly status: 'complete' | 'partial'
  readonly totalPairs: number
  readonly truncated: boolean
  readonly workspaceId: string
}
export interface InspectionUnavailable {
  readonly code: string
  readonly status: 'unavailable'
}
export type OptionalInspection = InspectionReport | InspectionUnavailable
export interface InspectKnowledgeRepositoryOptions {
  readonly inspectionMode?: InspectionMode
  readonly cacheDirectory?: string
  readonly inputPath: string
  readonly limit: number
  readonly model: string
}
interface InspectCachedPairOptions {
  readonly reader?: ResearchReader
  readonly points: ReadonlyArray<StoredKnowledgePoint>
  readonly inspectionMode: InspectionMode
  readonly baseUrl: string
  readonly directory: string
  readonly key: string
  readonly model: InspectionModel
  readonly pair: InspectionPair
}
interface CachedAssessment {
  readonly research?: ResearchReview
  readonly assessment: Assessment
  readonly review?: ContextReview
  readonly cached: boolean
  readonly ok: true
}
interface FailedAssessment {
  readonly code: string
  readonly ok: false
}
type CachedAssessmentResult = CachedAssessment | FailedAssessment
const cacheSchema = z
  .object({
    assessment: z.unknown(),
    key: z.string(),
    leftId: z.string(),
    review: z.unknown().optional(),
    rightId: z.string(),
    version: z.literal(1),
  })
  .strict()
const classifyPair = (
  options: InspectCachedPairOptions,
): Promise<AssessmentResult | ContextualResult | ResearchResult> => {
  switch (options.inspectionMode) {
    case 'combined':
      return classifyInspectionPair(options)
    case 'separated':
      return classifySeparatedPair(options)
    case 'contextual':
      return classifyContextualPair(options)
    case 'research':
      return options.reader === undefined
        ? Promise.resolve({error: {code: 'inspection-search-unavailable'}, ok: false})
        : classifyResearchPair({...options, reader: options.reader})
    default: {
      const exhaustive: never = options.inspectionMode
      return exhaustive
    }
  }
}
const inspectUncachedResearch = async (
  options: InspectCachedPairOptions,
): Promise<CachedAssessmentResult> => {
  if (options.reader === undefined) {
    return {code: 'inspection-search-unavailable', ok: false}
  }
  let linked: ReadonlyArray<StoredKnowledgePoint>
  let history: ResearchJournal | undefined
  try {
    linked = await readInspectionLinks(options)
    history = await readInspectionJournal(options)
  } catch {
    return {code: 'inspection-links-read-failed', ok: false}
  }
  const result = await classifyResearchPair({...options, history, linked, reader: options.reader})
  if (!result.ok) {
    return {code: result.error.code, ok: false}
  }
  try {
    await writeInspectionLinks({...options, research: result.research})
  } catch {
    return {code: 'inspection-links-write-failed', ok: false}
  }
  return {assessment: result.value, cached: false, ok: true, research: result.research}
}
const inspectCachedPair = async (
  options: InspectCachedPairOptions,
): Promise<CachedAssessmentResult> => {
  if (options.inspectionMode === 'research') {
    return inspectUncachedResearch(options)
  }
  const path = join(options.directory, `${options.key}.json`)
  let exists = true
  try {
    await lstat(path)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      exists = false
    } else {
      throw error
    }
  }
  if (exists) {
    const parsed = cacheSchema.safeParse(await readArtifact(path))
    if (
      !parsed.success ||
      parsed.data.key !== options.key ||
      parsed.data.leftId !== options.pair.left.pointId ||
      parsed.data.rightId !== options.pair.right.pointId
    ) {
      return {code: 'invalid-inspection-cache', ok: false}
    }
    if (options.inspectionMode === 'contextual') {
      const result = parseContextualReview({
        ...options,
        assessment: parsed.data.assessment,
        review: parsed.data.review,
      })
      return result.ok
        ? {assessment: result.value, cached: true, ok: true, review: result.review}
        : {code: 'invalid-inspection-cache', ok: false}
    }
    if (parsed.data.review !== undefined) {
      return {code: 'invalid-inspection-cache', ok: false}
    }
    const assessment = parseAssessment({input: parsed.data.assessment, pair: options.pair})
    return assessment.ok
      ? {assessment: assessment.value, cached: true, ok: true}
      : {code: 'invalid-inspection-cache', ok: false}
  }
  const result = await classifyPair(options)
  if (!result.ok) {
    return {code: result.error.code, ok: false}
  }
  await writeArtifact({
    path,
    value: {
      assessment: result.value,
      ...('review' in result ? {review: result.review} : {}),
      key: options.key,
      leftId: options.pair.left.pointId,
      rightId: options.pair.right.pointId,
      version: 1,
    },
  })
  return {
    assessment: result.value,
    cached: false,
    ok: true,
    ...('review' in result ? {review: result.review} : {}),
  }
}
const inspectRepository = async (
  options: InspectKnowledgeRepositoryOptions,
): Promise<OptionalInspection> => {
  const MAX_PAIRS = 100
  const inspectionMode = options.inspectionMode ?? 'combined'
  const versions: Readonly<Record<InspectionMode, number>> = {
    combined: INSPECTION_PROMPT_VERSION,
    contextual: CONTEXTUAL_INSPECTION_VERSION,
    research: RESEARCH_INSPECTION_VERSION,
    separated: SEPARATED_INSPECTION_VERSION,
  }
  if (!Object.hasOwn(versions, inspectionMode)) {
    return {code: 'invalid-inspection-mode', status: 'unavailable'}
  }
  const promptVersion = versions[inspectionMode]
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > MAX_PAIRS) {
    return {code: 'invalid-inspection-limit', status: 'unavailable'}
  }
  const context = await loadInspectionSource(options.inputPath)
  const selection = await retrieveInspectionPairs({...context, limit: options.limit})
  if (!selection.ok) {
    return {code: selection.error.code, status: 'unavailable'}
  }
  const {pairs, ...coverage} = selection.value
  const report: InspectionReport = {
    assessments: [],
    cached: 0,
    ...coverage,
    errors: [],
    limit: options.limit,
    promptVersion,
    repoId: context.repoId,
    selectedPairs: pairs.length,
    sourceUnits: context.points
      .filter(({payload}) => payload.status === 'active')
      .map(({payload}) => ({
        contentHash: payload.contentHash,
        docId: payload.docId,
        unitId: payload.unitId,
      })),
    status: coverage.retrieval.errors.length === 0 ? 'complete' : 'partial',
    workspaceId: context.workspaceId,
  }
  if (pairs.length === 0) {
    return report
  }
  const resolved = await resolveQuestionModel({baseUrl: context.ollamaUrl, model: options.model})
  if (!resolved.ok) {
    return {code: 'inspection-model-unavailable', status: 'unavailable'}
  }
  const model = resolved.value
  const directory =
    options.cacheDirectory ??
    join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'knowledge', 'inspection')
  await mkdir(directory, {recursive: true})
  return withKnowledgeLock(directory, async () => {
    const assessments: InspectionFinding[] = []
    const errors: Array<{readonly cacheKey: string; readonly code: string}> = []
    let cached = 0
    for (const pair of pairs) {
      let points: ReadonlyArray<StoredKnowledgePoint> = []
      switch (inspectionMode) {
        case 'combined':
        case 'separated':
          break
        case 'contextual':
          points = collectInspectionContext({pair, points: context.points})
          break
        case 'research': {
          const {points: snapshot} = context
          points = snapshot
          break
        }
        default: {
          const exhaustive: never = inspectionMode
          return exhaustive
        }
      }
      const key =
        inspectionMode === 'contextual'
          ? contextualKey({model, pair, points})
          : inspectionKey({model, pair, promptVersion})
      try {
        // Keep local model requests sequential; a failed pair does not discard other diagnostics.
        // eslint-disable-next-line no-await-in-loop
        const result = await inspectCachedPair({
          baseUrl: context.ollamaUrl,
          directory,
          inspectionMode,
          key,
          model,
          pair,
          points,
          ...(context.research === undefined ? {} : {reader: context.research}),
        })
        if (result.ok) {
          cached += Number(result.cached)
          const {left, right} = pair
          assessments.push({
            assessment: result.assessment,
            ...(result.research === undefined ? {} : {research: result.research}),
            ...(result.review === undefined ? {} : {review: result.review}),
            cacheKey: key,
            left: {
              contentHash: left.payload.contentHash,
              docId: left.payload.docId,
              unitId: left.payload.unitId,
            },
            right: {
              contentHash: right.payload.contentHash,
              docId: right.payload.docId,
              unitId: right.payload.unitId,
            },
          })
        } else {
          errors.push({cacheKey: key, code: result.code})
        }
      } catch {
        errors.push({cacheKey: key, code: 'inspection-pair-unavailable'})
      }
    }
    return {
      ...report,
      assessments,
      cached,
      errors,
      model,
      status: errors.length === 0 && report.retrieval.errors.length === 0 ? 'complete' : 'partial',
    }
  })
}
/** Runs optional cached diagnostics; failures remain separate from base doctor health and never mutate the index. */
export const inspectKnowledgeRepository = async (
  options: InspectKnowledgeRepositoryOptions,
): Promise<OptionalInspection> => {
  try {
    return await inspectRepository(options)
  } catch {
    return {code: 'inspection-unavailable', status: 'unavailable'}
  }
}
