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
const continuingNarration = (input: SemanticInput, previous?: SemanticFrame) =>
  input.narration?.phase === 'playing' &&
  previous?.narration?.phase === 'playing' &&
  input.narration.readoutId === previous.narration.readoutId
const retainedFrame = (input: SemanticInput, previous?: SemanticFrame): SemanticFrame => ({
  ...previous,
  narration: {phase: 'ended'},
  scores: previous?.scores ?? {},
  widgetId: input.widgetId,
})

/** Retains completed output during preparation and clears it when the next audio starts. */
export const transitionSemanticFrame = (
  options: TransitionSemanticFrameOptions,
): SemanticTransition => {
  const {input, previous} = options
  const {narration} = input
  if (narration?.phase === 'preparing') {
    return {
      frame: retainedFrame(input, previous),
      kind: input.text.trim() === '' ? 'idle' : 'analyze',
    }
  }
  if (narration?.phase === 'waiting' || narration?.phase === 'ended') {
    return {
      frame: retainedFrame(input, previous),
      kind: 'idle',
    }
  }
  if (input.text.trim() === '') {
    if (previous !== undefined && continuingNarration(input, previous)) {
      return {frame: previous, kind: 'idle'}
    }
    return {frame: {scores: {}, widgetId: input.widgetId}, kind: 'idle'}
  }
  if (narration?.phase === 'playing' && !continuingNarration(input, previous)) {
    return {frame: {narration, scores: {}, widgetId: input.widgetId}, kind: 'analyze'}
  }
  return {kind: 'analyze'}
}
