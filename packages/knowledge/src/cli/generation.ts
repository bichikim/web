import {lstat, mkdir} from 'node:fs/promises'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {z} from 'zod'
import {generateQuestions, resolveQuestionModel} from '../adapters/questions'
import {
  approveEvaluation,
  type CandidateEntry,
  createCandidateSet,
  generationKey,
  type GenerationKeyOptions,
  parseGeneratedEvaluation,
  parseQuestions,
  type QuestionPair,
} from '../evaluation/index'
import {assertArtifactAbsent, readArtifact, writeArtifact} from './artifacts'
import {withKnowledgeLock} from './lock'
import {KnowledgeCommandFailure, loadGenerationSource} from './runtime'

interface CachedQuestionOptions extends GenerationKeyOptions {
  readonly baseUrl: string
  readonly cacheDirectory: string
}
interface CachedQuestionResult {
  readonly cached: boolean
  readonly questions: QuestionPair
}
const cacheSchema = z
  .object({key: z.string(), questions: z.unknown(), version: z.literal(1)})
  .strict()
const cachedQuestions = async (options: CachedQuestionOptions): Promise<CachedQuestionResult> => {
  const key = generationKey(options)
  const path = join(options.cacheDirectory, `${key}.json`)
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
    const questions = parseQuestions(parsed.success ? parsed.data.questions : undefined)
    if (!parsed.success || parsed.data.key !== key || !questions.ok) {
      throw new KnowledgeCommandFailure({error: {code: 'invalid-question-cache'}, ok: false})
    }
    return {cached: true, questions: questions.value}
  }
  const generated = await generateQuestions(options)
  if (!generated.ok) {
    throw new KnowledgeCommandFailure(generated)
  }
  await writeArtifact({path, value: {key, questions: generated.value, version: 1}})
  return {cached: false, questions: generated.value}
}
export interface GenerateKnowledgeEvaluationOptions {
  readonly cacheDirectory?: string
  readonly inputPath: string
  readonly limit: number
  readonly model: string
  readonly outputPath: string
}
export interface GenerationSummary {
  readonly cached: number
  readonly cases: number
  readonly generated: number
  readonly outputPath: string
}
/** Generates candidates from active indexed units, retaining reusable cache entries after failures. */
export const generateKnowledgeEvaluation = async (
  options: GenerateKnowledgeEvaluationOptions,
): Promise<GenerationSummary> => {
  await assertArtifactAbsent(options.outputPath)
  const context = await loadGenerationSource(options.inputPath)
  const points = context.points
    .filter(({payload}) => payload.status === 'active')
    .toSorted((left, right) => left.pointId.localeCompare(right.pointId))
    .slice(0, options.limit)
  const MAX_UNITS = 100
  if (
    !Number.isInteger(options.limit) ||
    options.limit < 1 ||
    options.limit > MAX_UNITS ||
    points.length === 0
  ) {
    throw new KnowledgeCommandFailure({error: {code: 'invalid-generation-source'}, ok: false})
  }
  const model = await resolveQuestionModel({baseUrl: context.ollamaUrl, model: options.model})
  if (!model.ok) {
    throw new KnowledgeCommandFailure(model)
  }
  const cacheDirectory =
    options.cacheDirectory ??
    join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'knowledge', 'evaluation')
  await mkdir(cacheDirectory, {recursive: true})
  return withKnowledgeLock(cacheDirectory, async () => {
    const entries: CandidateEntry[] = []
    let cached = 0
    for (const {payload} of points) {
      const request = {
        model: model.value,
        repoId: context.repoId,
        source: {
          contentHash: payload.contentHash,
          docId: payload.docId,
          text: payload.text,
          title: payload.title,
          unitId: payload.unitId,
        },
        workspaceId: context.workspaceId,
      }
      // Keep local generation sequential and publish only a complete candidate file.
      // eslint-disable-next-line no-await-in-loop
      const result = await cachedQuestions({...request, baseUrl: context.ollamaUrl, cacheDirectory})
      cached += Number(result.cached)
      entries.push({...request, questions: result.questions})
    }
    const artifact = createCandidateSet({
      entries,
      repoId: context.repoId,
      workspaceId: context.workspaceId,
    })
    const parsed = parseGeneratedEvaluation(artifact)
    if (!parsed.ok) {
      throw new KnowledgeCommandFailure(parsed)
    }
    await writeArtifact({path: options.outputPath, value: parsed.value})
    return {
      cached,
      cases: artifact.cases.length,
      generated: points.length - cached,
      outputPath: options.outputPath,
    }
  })
}
export interface ApproveKnowledgeEvaluationOptions {
  readonly candidatePath: string
  readonly ids: ReadonlyArray<string>
  readonly outputPath: string
  readonly reviewer: string
}
export interface ApprovalSummary {
  readonly approved: number
  readonly outputPath: string
}
/** Records the user's explicit selection as a separate golden file; never changes candidate or cache files. */
export const approveKnowledgeEvaluation = async (
  options: ApproveKnowledgeEvaluationOptions,
): Promise<ApprovalSummary> => {
  await assertArtifactAbsent(options.outputPath)
  const result = approveEvaluation({
    candidate: await readArtifact(options.candidatePath),
    ids: options.ids,
    reviewedAt: new Date().toISOString(),
    reviewer: options.reviewer,
  })
  if (!result.ok) {
    throw new KnowledgeCommandFailure(result)
  }
  await writeArtifact({path: options.outputPath, value: result.value})
  return {approved: result.value.cases.length, outputPath: options.outputPath}
}
