import type {SemanticFrame, SemanticInput} from '@winter-love/wallpaper/settings/semantics'

interface SemanticIdleTransition {
  readonly kind: 'idle'
  readonly frame: SemanticFrame
}
interface SemanticAnalysisTransition {
  readonly kind: 'analyze'
  readonly frame?: SemanticFrame
}
type SemanticTransition = SemanticIdleTransition | SemanticAnalysisTransition
interface TransitionSemanticFrameOptions {
  /** New text and explicit audio lifecycle, or text-only input when lifecycle is omitted. */
  readonly input: SemanticInput
  /** Last published frame; omitted starts with no active action. */
  readonly previous?: SemanticFrame
}

/** Retains completed output during preparation and clears it when the next audio starts. */
export const transitionSemanticFrame = (
  options: TransitionSemanticFrameOptions,
): SemanticTransition => {
  const {input, previous} = options
  const {narration} = input
  if (narration?.phase === 'waiting' || narration?.phase === 'ended') {
    return {
      frame: {
        ...previous,
        narration: {phase: 'ended'},
        scores: previous?.scores ?? {},
        widgetId: input.widgetId,
      },
      kind: 'idle',
    }
  }
  if (input.text.trim() === '') {
    return {frame: {scores: {}, widgetId: input.widgetId}, kind: 'idle'}
  }
  if (
    narration?.phase === 'playing' &&
    (previous?.narration?.phase !== 'playing' ||
      previous.narration.readoutId !== narration.readoutId)
  ) {
    return {frame: {narration, scores: {}, widgetId: input.widgetId}, kind: 'analyze'}
  }
  return {kind: 'analyze'}
}
