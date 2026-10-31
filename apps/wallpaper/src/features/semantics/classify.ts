import {SEMANTIC_TEXT_LIMIT, type SemanticBinding} from '@winter-love/wallpaper/settings/semantics'

interface ClassifySemanticsOptions {
  readonly text: string
  readonly bindings: readonly SemanticBinding[]
  readonly embed: (texts: readonly string[]) => Promise<readonly (readonly number[])[]>
}
export const classifySemantics = async (
  options: ClassifySemanticsOptions,
): Promise<Readonly<Record<string, number>>> => {
  const bindings = options.bindings.filter(
    (item) => item.enabled && item.parameterId !== null && item.text.trim() !== '',
  )
  if (bindings.length === 0 || options.text.trim() === '') {
    return {}
  }
  const vectors = await options.embed(
    [options.text.slice(-SEMANTIC_TEXT_LIMIT), ...bindings.map((item) => item.text)].map(
      (text) => `task: classification | query: ${text}`,
    ),
  )
  const [input] = vectors
  if (vectors.length !== bindings.length + 1 || input === undefined || input.length === 0) {
    throw new Error('EmbeddingGemma 2 returned invalid embeddings')
  }
  return Object.fromEntries(
    bindings.map((binding, index) => {
      const vector = vectors[index + 1]
      if (
        vector === undefined ||
        vector.length !== input.length ||
        ![...input, ...vector].every(Number.isFinite)
      ) {
        throw new Error('EmbeddingGemma 2 returned invalid embeddings')
      }
      const dot = vector.reduce((sum, value, dimension) => sum + value * input[dimension], 0)
      return [binding.id, Math.max(-1, Math.min(1, dot))]
    }),
  )
}
