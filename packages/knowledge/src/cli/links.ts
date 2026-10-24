import {createHash} from 'node:crypto'
import {lstat, mkdir, mkdtemp, rename, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {isDeepStrictEqual} from 'node:util'
import {z} from 'zod'
import type {StoredKnowledgePoint} from '../indexing/store'
import {
  contextPassages,
  type ContextSource,
  createEvidencePassages,
  type InspectionModel,
  type InspectionPair,
  RESEARCH_INSPECTION_VERSION,
  type ResearchJournal,
  researchJournalSchema,
  type ResearchReview,
} from '../inspection/index'
import {readArtifact} from './artifacts'

const MAX_LINKS = 6
const MAX_TEXT = 4000
const MAX_PASSAGE = 800
const MAX_REASON = 1000
const sourceSchema = z
  .object({
    contentHash: z.string().min(1),
    docId: z.string().min(1),
    endLine: z.number().int().positive().optional(),
    path: z.string(),
    pointId: z.string().min(1),
    startLine: z.number().int().positive().optional(),
    text: z.string().min(1).max(MAX_TEXT),
    title: z.string(),
    truncated: z.boolean(),
    unitId: z.string().min(1),
  })
  .strict()
const linkSchema = z
  .object({
    passages: z.array(z.string().min(1).max(MAX_PASSAGE)).min(1).max(MAX_LINKS),
    reason: z.string().min(1).max(MAX_REASON),
    source: sourceSchema,
  })
  .strict()
const legacySchema = z
  .object({
    key: z.string(),
    links: z.array(linkSchema).max(MAX_LINKS),
    model: z.object({digest: z.string(), name: z.string()}).strict(),
    pair: z
      .array(
        z
          .object({
            contentHash: z.string(),
            docId: z.string(),
            pointId: z.string(),
            repoId: z.string(),
            unitId: z.string(),
            workspaceId: z.string(),
          })
          .strict(),
      )
      .length(2),
    promptVersion: z.number().int().positive(),
    version: z.literal(1),
  })
  .strict()
const recordSchema = z.discriminatedUnion('version', [
  legacySchema,
  legacySchema.extend({journal: researchJournalSchema, version: z.literal(2)}),
])
interface InspectionLink {
  readonly source: ContextSource
  readonly passages: ReadonlyArray<string>
  readonly reason: string
}
export interface ReadInspectionLinksOptions {
  readonly directory: string
  readonly pair: InspectionPair
  readonly points: ReadonlyArray<StoredKnowledgePoint>
}
export interface WriteInspectionLinksOptions extends ReadInspectionLinksOptions {
  readonly model: InspectionModel
  readonly research: ResearchReview
}
const pairReferences = (pair: InspectionPair) =>
  [pair.left, pair.right]
    .toSorted((left, right) => left.pointId.localeCompare(right.pointId))
    .map(({payload, pointId}) => ({
      contentHash: payload.contentHash,
      docId: payload.docId,
      pointId,
      repoId: payload.repoId,
      unitId: payload.unitId,
      workspaceId: payload.workspaceId,
    }))
const pairKey = (pair: InspectionPair): string =>
  createHash('sha256')
    .update(
      JSON.stringify(
        [pair.left, pair.right]
          .toSorted((left, right) => left.pointId.localeCompare(right.pointId))
          .map(({payload, pointId}) => [
            pointId,
            payload.repoId,
            payload.workspaceId,
            payload.docId,
            payload.unitId,
            payload.contentHash,
            payload.title,
            payload.text,
            payload.status,
          ]),
      ),
    )
    .digest('hex')
const exists = async (path: string): Promise<boolean> => {
  try {
    const metadata = await lstat(path)
    if (!metadata.isFile()) {
      throw new Error('invalid-inspection-links')
    }
    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false
    }
    throw error
  }
}
const currentSource = (
  source: ContextSource,
  options: ReadInspectionLinksOptions,
): StoredKnowledgePoint | undefined =>
  options.points.find(
    ({pointId, payload}) =>
      pointId === source.pointId &&
      pointId !== options.pair.left.pointId &&
      pointId !== options.pair.right.pointId &&
      payload.repoId === options.pair.left.payload.repoId &&
      payload.workspaceId === options.pair.left.payload.workspaceId &&
      payload.status === 'active' &&
      payload.docId === source.docId &&
      payload.unitId === source.unitId &&
      payload.contentHash === source.contentHash &&
      payload.text.startsWith(source.text),
  )
const readRecord = async (options: ReadInspectionLinksOptions) => {
  const key = pairKey(options.pair)
  const path = join(options.directory, 'links', `${key}.json`)
  if (!(await exists(path))) {
    return undefined
  }
  const parsed = recordSchema.safeParse(await readArtifact(path))
  if (
    !parsed.success ||
    parsed.data.key !== key ||
    !isDeepStrictEqual(parsed.data.pair, pairReferences(options.pair))
  ) {
    throw new Error('invalid-inspection-links')
  }
  return parsed.data
}
export interface ReadInspectionJournalOptions extends ReadInspectionLinksOptions {
  readonly model: InspectionModel
}
/** Reads investigation history only under the same model and research policy; the engine checks corpus freshness. */
export const readInspectionJournal = async (
  options: ReadInspectionJournalOptions,
): Promise<ResearchJournal | undefined> => {
  const record = await readRecord(options)
  return record?.version === 2 &&
    record.promptVersion === RESEARCH_INSPECTION_VERSION &&
    isDeepStrictEqual(record.model, options.model)
    ? record.journal
    : undefined
}
/** Reads cited source links for an unchanged pair, excluding stale or out-of-scope evidence. */
export const readInspectionLinks = async (
  options: ReadInspectionLinksOptions,
): Promise<ReadonlyArray<StoredKnowledgePoint>> => {
  const record = await readRecord(options)
  if (record === undefined) {
    return []
  }
  const points = new Map<string, StoredKnowledgePoint>()
  for (const {source, passages} of record.links) {
    const allowed = new Set(
      createEvidencePassages({side: 'left', text: source.text}).map((passage) => passage.text),
    )
    if (passages.some((passage) => !allowed.has(passage))) {
      throw new Error('invalid-inspection-links')
    }
    const point = currentSource(source, options)
    if (point !== undefined) {
      points.set(point.pointId, point)
    }
  }
  return [...points.values()]
}
const citedLinks = (options: WriteInspectionLinksOptions): ReadonlyArray<InspectionLink> => {
  const {research} = options
  const decision =
    research.rounds.findLast((round) => round.decision !== undefined)?.decision ??
    research.reused?.decision
  if (decision === undefined) {
    return []
  }
  const citations = new Set(decision.citations)
  const passages = contextPassages(research.selection)
  if (
    citations.size > MAX_LINKS ||
    citations.size !== decision.citations.length ||
    decision.citations.some((id) => !passages.some((passage) => passage.id === id))
  ) {
    throw new Error('invalid-inspection-links')
  }
  return research.selection.sources.flatMap((source, index) => {
    const cited = passages.filter(
      (passage) => passage.id.startsWith(`context-${index + 1}-`) && citations.has(passage.id),
    )
    if (cited.length === 0) {
      return []
    }
    if (currentSource(source, options) === undefined) {
      throw new Error('invalid-inspection-links')
    }
    return [
      {passages: cited.map((passage) => passage.text), reason: decision.proposed.reason, source},
    ]
  })
}
/** Replaces the pair's derived links with the last decision's citations; callers hold the inspection directory lock. */
export const writeInspectionLinks = async (options: WriteInspectionLinksOptions): Promise<void> => {
  const key = pairKey(options.pair)
  const directory = join(options.directory, 'links')
  const path = join(directory, `${key}.json`)
  const links = citedLinks(options)
  if (links.length === 0 && options.research.journal === undefined && !(await exists(path))) {
    return
  }
  const record = recordSchema.parse({
    key,
    links,
    model: options.model,
    pair: pairReferences(options.pair),
    promptVersion: RESEARCH_INSPECTION_VERSION,
    ...(options.research.journal === undefined
      ? {version: 1}
      : {journal: options.research.journal, version: 2}),
  })
  await mkdir(directory, {recursive: true})
  const temporary = await mkdtemp(join(directory, '.pending-'))
  try {
    const staged = join(temporary, 'links.json')
    await writeFile(staged, `${JSON.stringify(record, null, 2)}\n`, {flag: 'wx', mode: 0o600})
    await rename(staged, path)
  } finally {
    await rm(temporary, {force: true, recursive: true})
  }
}
