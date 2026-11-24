import type {
  SemanticBinding,
  SemanticFrame,
  SemanticInput,
} from '@winter-love/wallpaper/settings/semantics'
import type {createSemanticAnalysis} from './create-semantic-analysis'

interface AnalyzeSemanticWindowOptions {
  /** Current text and at most one immediately following meaning segment. */
  readonly input: SemanticInput
  /** Connections captured for this analysis revision. */
  readonly bindings: readonly SemanticBinding[]
  /** Shared, cached local classifier; failures reject. */
  readonly analyze: ReturnType<typeof createSemanticAnalysis>
  /** Whether this window still belongs to the selected narration and current settings. */
  readonly current: () => boolean
  /** Applies the audible segment only; preparation and lookahead never invoke it. */
  readonly publish: (scores: SemanticFrame['scores']) => Promise<void>
}

/** Classifies current prose before prefetching one successor, without exposing its scores early. */
export const analyzeSemanticWindow = async (options: AnalyzeSemanticWindowOptions) => {
  const {bindings, input} = options
  const scores = await options.analyze({bindings, text: input.text})
  if (!options.current()) {
    return
  }
  if (input.narration?.phase !== 'preparing') {
    await options.publish(scores)
  }
  if (options.current() && input.nextText?.trim()) {
    await options.analyze({bindings, text: input.nextText}).catch((cause: unknown) => {
      console.error('Local semantic prefetch failed', cause)
    })
  }
}
