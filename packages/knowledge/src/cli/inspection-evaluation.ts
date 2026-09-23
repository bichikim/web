import {createInspectionEvaluation, type InspectionEvaluationReport} from '../evaluation/index'
import {assertArtifactAbsent, readArtifact, writeArtifact} from './artifacts'
import {KnowledgeCommandFailure} from './runtime'

export interface EvaluateInspectionArtifactOptions {
  readonly datasetPath: string
  readonly reportPath: string
  readonly baseline?: string
  readonly outputPath?: string
}
/** Evaluates recorded doctor output without contacting models or storage; optional output is never overwritten. */
export const evaluateInspectionArtifact = async (
  options: EvaluateInspectionArtifactOptions,
): Promise<InspectionEvaluationReport> => {
  if (options.outputPath !== undefined) {
    await assertArtifactAbsent(options.outputPath)
  }
  const dataset = await readArtifact(options.datasetPath)
  const diagnostic = await readArtifact(options.reportPath)
  const baseline = options.baseline === undefined ? undefined : await readArtifact(options.baseline)
  const result = createInspectionEvaluation({baseline, dataset, diagnostic})
  if (!result.ok) {
    throw new KnowledgeCommandFailure(result)
  }
  if (options.outputPath !== undefined) {
    await writeArtifact({path: options.outputPath, value: result.value})
  }
  return result.value
}
