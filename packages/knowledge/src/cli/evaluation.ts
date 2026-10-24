import {
  createEvaluationReport,
  type EvaluationRanking,
  type EvaluationReport,
  parseEvaluationDataset,
  parseGeneratedEvaluation,
  toEvaluationDataset,
} from '../evaluation/index'
import type {EvalCommand} from './arguments'
import {readArtifact} from './artifacts'
import {KnowledgeCommandFailure, searchKnowledgeRepository} from './runtime'

/** Evaluates the existing repository search path without changing indexed data. */
export const evaluateKnowledgeRepository = async (
  options: EvalCommand,
): Promise<EvaluationReport> => {
  const input = await readArtifact(options.datasetPath)
  const generated = parseGeneratedEvaluation(input)
  const parsed = parseEvaluationDataset(generated.ok ? toEvaluationDataset(generated.value) : input)
  if (!parsed.ok) {
    throw new KnowledgeCommandFailure(parsed)
  }
  const baseline = options.baseline === undefined ? undefined : await readArtifact(options.baseline)
  const rankings: EvaluationRanking[] = []
  for (const entry of parsed.value.cases) {
    // Keep model requests sequential to avoid saturating the local embedding service.
    // eslint-disable-next-line no-await-in-loop
    const result = await searchKnowledgeRepository({
      inputPath: options.inputPath,
      limit: options.cutoff,
      query: entry.query,
    })
    if (
      generated.ok &&
      (result.repoId !== generated.value.repoId ||
        result.workspaceId !== generated.value.workspaceId)
    ) {
      throw new KnowledgeCommandFailure({error: {code: 'evaluation-scope-mismatch'}, ok: false})
    }
    rankings.push({
      hits: result.hits.map(({payload}) => ({docId: payload.docId, unitId: payload.unitId})),
      id: entry.id,
      repoId: result.repoId,
      workspaceId: result.workspaceId,
    })
  }
  const report = createEvaluationReport({
    baseline,
    cutoff: options.cutoff,
    dataset: parsed.value,
    rankings,
  })
  if (!report.ok) {
    throw new KnowledgeCommandFailure(report)
  }
  return report.value
}
