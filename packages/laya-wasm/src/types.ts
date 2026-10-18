export interface ChoiceQuestion {
  readonly type: 'choice'
  readonly instructions: string
  readonly criteria: readonly string[] | Readonly<Record<string, string | null>>
}
export interface ScoreQuestion {
  readonly type: 'score'
  readonly instructions: string
  readonly criteria: readonly string[]
}
export interface NoulQuestion {
  readonly type: 'noul'
  readonly instructions: string
  readonly criteria?: {readonly false?: string; readonly true?: string}
}
export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject
export interface JsonObject {
  readonly [key: string]: JsonValue
}
export interface ModelConfig {
  readonly maxLength: number
  readonly headLength: number
}
export interface SpecialTokens {
  readonly cls: number
  readonly sep: number
  readonly mask: number
  readonly pad: number
  readonly maskToken: string
}
export interface Sequence {
  readonly ids: readonly number[]
  readonly markers: readonly number[]
}
export interface SequenceOptions {
  readonly encode: (text: string) => number[]
  readonly special: SpecialTokens
  readonly config: ModelConfig
  readonly state: JsonValue
  readonly question: Question
}
export interface ParameterLayout {
  readonly name: string
  readonly dimensions: readonly number[]
}
export interface Calibration {
  readonly maxLength: number
  readonly headLength: number
  readonly temperature: readonly number[]
  readonly optionTemperatures: Readonly<Record<string, number>>
}
export interface Manifest {
  readonly version: 1
  readonly modelId: string
  readonly width: number
  readonly featureOutput: string
  readonly externalData: readonly string[]
  readonly config: Calibration
  readonly parameters: readonly ParameterLayout[]
}
export interface LoadOptions {
  /** URL of the directory produced by tools/prepare.py. */
  readonly baseUrl: string
  readonly signal?: AbortSignal
  readonly checkpoint?: Checkpoint
}
export interface Checkpoint {
  readonly version: 1
  readonly modelId: string
  readonly steps: number
  readonly parameters: Float32Array
}
export interface AnswerMetadata {
  readonly probabilities: Readonly<Record<string, number>>
  readonly confidence: number
}
export interface ChoiceAnswer extends AnswerMetadata {
  readonly type: 'choice'
  readonly choice: string
}
export interface ScoreAnswer extends AnswerMetadata {
  readonly type: 'score'
  readonly score: number
}
export interface NoulAnswer extends AnswerMetadata {
  readonly type: 'noul'
  readonly noul: number
}
export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer
export interface DecisionResult {
  readonly answers: Readonly<Record<string, Answer>>
  readonly inputTokens: number
}
export interface TrainingExample {
  readonly state: JsonValue
  readonly question: Question
  /** Distribution in criteria order; noul is [false, true]. Must sum to one. */
  readonly target: readonly number[]
}
export interface TrainingProgress {
  readonly epoch: number
  readonly example: number
  readonly steps: number
  readonly loss: number
}
export interface TrainOptions {
  readonly epochs?: number
  readonly learningRate?: number
  readonly signal?: AbortSignal
  readonly onProgress?: (progress: TrainingProgress) => void
}
export interface TrainingResult {
  readonly status: 'completed' | 'cancelled'
  readonly steps: number
  readonly meanLoss: number | null
}
