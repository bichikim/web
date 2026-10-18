import type {LayaWasm} from '../../src/laya-wasm'
import type {TrainingProgress} from '../../src/types'
import {evaluateExamples} from './evaluate-examples'
import {validateEvaluationSplit} from './validate-evaluation-split'
import type {EvaluationProgress, TrainingCommand, TrainingReply} from './types'

export interface TrainingOptions {
  readonly model: Pick<LayaWasm, 'systemOne' | 'train'>
  readonly command: TrainingCommand
  readonly signal: AbortSignal
  readonly onProgress: (progress: TrainingProgress) => void
  readonly onEvaluation: (progress: EvaluationProgress | null) => void
}
export const trainAndEvaluate = async (options: TrainingOptions): Promise<TrainingReply> => {
  const {command, model, signal} = options
  const evaluation = command.evaluation ?? []
  validateEvaluationSplit(command.examples, evaluation)
  const before = (await model.systemOne(command.prompt.state, {answer: command.prompt.question}))
    .answers.answer
  const evaluate = (stage: 'before' | 'after') =>
    evaluateExamples({
      examples: evaluation,
      onProgress: (completed) => options.onEvaluation({completed, stage, total: evaluation.length}),
      predict: async (example) =>
        (await model.systemOne(example.state, {answer: example.question})).answers.answer,
      signal,
    })
  const baseline = await evaluate('before')
  if (baseline === null) {
    return {
      comparison: {after: before, before, prompt: command.prompt},
      evaluation: null,
      result: {meanLoss: null, status: 'cancelled', steps: 0},
      type: 'trained',
    }
  }
  options.onEvaluation(null)
  const result = await model.train(command.examples, {
    epochs: command.epochs,
    learningRate: command.learningRate,
    onProgress: options.onProgress,
    signal,
  })
  const after = (await model.systemOne(command.prompt.state, {answer: command.prompt.question}))
    .answers.answer
  const current = result.status === 'completed' ? await evaluate('after') : null
  return {
    comparison: {after, before, prompt: command.prompt},
    evaluation:
      current !== null && evaluation.length > 0 ? {after: current, before: baseline} : null,
    result: current === null ? {...result, status: 'cancelled'} : result,
    type: 'trained',
  }
}
