import type {
  Answer,
  Checkpoint,
  Question,
  TrainingExample,
  TrainingProgress,
  TrainingResult,
} from '../../src/index'

export interface Prompt {
  readonly state: string
  readonly question: Question
}
export interface Comparison {
  readonly before: Answer | null
  readonly after: Answer
  readonly prompt: Prompt
}
export interface EvaluationRow {
  readonly state: string
  readonly expected: string
  readonly predicted: string
  readonly correct: boolean
}
export interface EvaluationScore {
  readonly correct: number
  readonly meanLoss: number | null
  readonly total: number
  readonly rows: readonly EvaluationRow[]
}
export interface EvaluationComparison {
  readonly before: EvaluationScore
  readonly after: EvaluationScore
}
export interface EvaluationProgress {
  readonly stage: 'before' | 'after'
  readonly completed: number
  readonly total: number
}
export interface LoadCommand {
  readonly type: 'load'
  readonly url: string
}
export interface InferenceCommand {
  readonly type: 'infer'
  readonly prompt: Prompt
}
export interface TrainingCommand {
  readonly type: 'train'
  readonly prompt: Prompt
  readonly examples: readonly TrainingExample[]
  readonly evaluation?: readonly TrainingExample[]
  readonly epochs: number
  readonly learningRate: number
}
export interface ResetCommand {
  readonly type: 'reset'
}
export interface ExportCommand {
  readonly type: 'export'
}
export interface RestoreCommand {
  readonly type: 'restore'
  readonly checkpoint: Checkpoint
}
export interface CancelCommand {
  readonly type: 'cancel'
}
export type Command =
  | LoadCommand
  | InferenceCommand
  | TrainingCommand
  | ResetCommand
  | ExportCommand
  | RestoreCommand
  | CancelCommand

export interface ReadyReply {
  readonly type: 'ready'
}
export interface InferenceReply {
  readonly type: 'inferred'
  readonly comparison: Comparison
}
export interface ProgressReply {
  readonly type: 'progress'
  readonly progress: TrainingProgress
}
export interface TrainingReply {
  readonly type: 'trained'
  readonly comparison: Comparison
  readonly result: TrainingResult
  readonly evaluation: EvaluationComparison | null
}
export interface EvaluationReply {
  readonly type: 'evaluation-progress'
  readonly progress: EvaluationProgress | null
}
export interface ResetReply {
  readonly type: 'reset'
}
export interface ExportReply {
  readonly type: 'exported'
  readonly checkpoint: Checkpoint
}
export interface RestoreReply {
  readonly type: 'restored'
  readonly steps: number
}
export interface FailureReply {
  readonly type: 'failed'
  readonly message: string
  readonly loaded: boolean
}
export type Reply =
  | ReadyReply
  | InferenceReply
  | ProgressReply
  | TrainingReply
  | EvaluationReply
  | ResetReply
  | ExportReply
  | RestoreReply
  | FailureReply
export type Phase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'inferring'
  | 'training'
  | 'exporting'
  | 'restoring'
export interface DatasetEntry {
  readonly id: number
  readonly example: TrainingExample
  readonly label: string
}
