import type {Checkpoint, TrainingProgress} from '../../src/types'
import type {Comparison, EvaluationComparison, EvaluationProgress, Phase, Reply} from './types'

export type TrainingOutcome = 'idle' | 'running' | 'completed' | 'cancelled' | 'failed'
export interface Session {
  readonly phase: Phase
  readonly error: string | null
  readonly comparison: Comparison | null
  readonly progress: TrainingProgress | null
  readonly losses: readonly number[]
  readonly steps: number
  readonly total: number
  readonly outcome: TrainingOutcome
  readonly cancelling: boolean
  readonly exported: Checkpoint | null
  readonly evaluation: EvaluationComparison | null
  readonly evaluationProgress: EvaluationProgress | null
}
export const initialSession = (): Session => ({
  cancelling: false,
  comparison: null,
  error: null,
  evaluation: null,
  evaluationProgress: null,
  exported: null,
  losses: [],
  outcome: 'idle',
  phase: 'idle',
  progress: null,
  steps: 0,
  total: 0,
})

export const reduceSession = (state: Session, message: Reply): Session => {
  switch (message.type) {
    case 'ready':
      return {...state, phase: 'ready'}
    case 'inferred':
      return {...state, comparison: message.comparison, phase: 'ready'}
    case 'progress':
      return {
        ...state,
        losses: [...state.losses, message.progress.loss],
        progress: message.progress,
        steps: message.progress.steps,
      }
    case 'evaluation-progress':
      return {...state, evaluationProgress: message.progress}
    case 'trained':
      return {
        ...state,
        cancelling: false,
        comparison: message.comparison,
        evaluation: message.evaluation,
        evaluationProgress: null,
        outcome: message.result.status,
        phase: 'ready',
      }
    case 'reset':
      return {...initialSession(), phase: 'ready'}
    case 'exported':
      return {...state, exported: message.checkpoint, phase: 'ready'}
    case 'restored':
      return {...initialSession(), phase: 'ready', steps: message.steps}
    case 'failed':
      return {
        ...state,
        cancelling: false,
        comparison: null,
        error: message.message,
        evaluation: null,
        evaluationProgress: null,
        outcome: state.phase === 'training' ? 'failed' : state.outcome,
        phase: message.loaded ? 'ready' : 'idle',
      }
    default: {
      const exhaustive: never = message
      throw new Error(`Unknown reply: ${String(exhaustive)}`)
    }
  }
}
