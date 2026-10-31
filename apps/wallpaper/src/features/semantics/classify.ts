import {SEMANTIC_TEXT_LIMIT, type SemanticBinding} from '@winter-love/wallpaper/settings/semantics'

interface ClassifySemanticsOptions {
  /** Latest conversational prose; the last eight nonempty paragraphs are compared separately. */
  readonly text: string
  /** Descriptions and optional exclusions each compare up to eight newline-separated examples. */
  readonly bindings: readonly SemanticBinding[]
  /** Returns normalized vectors in input order; model failures propagate to the host. */
  readonly embed: (texts: readonly string[]) => Promise<readonly (readonly number[])[]>
}
const EXAMPLE_LIMIT = 8
const similarity = (input: readonly number[], vector: readonly number[]) =>
  Math.max(
    -1,
    Math.min(
      1,
      vector.reduce((sum, value, dimension) => sum + value * input[dimension], 0),
    ),
  )
const examples = (text: string) =>
  text
    .split(/\n+/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(-EXAMPLE_LIMIT)
export const classifySemantics = async (
  options: ClassifySemanticsOptions,
): Promise<Readonly<Record<string, number>>> => {
  const bindings = options.bindings.filter(
    (item) => item.enabled && item.parameterId !== null && item.text.trim() !== '',
  )
  const inputs = examples(options.text.slice(-SEMANTIC_TEXT_LIMIT))
  if (bindings.length === 0 || inputs.length === 0) {
    return {}
  }
  const descriptions = bindings.map((binding) => ({
    binding,
    exclusions: examples(binding.excludeText ?? ''),
    texts: examples(binding.text),
  }))
  const texts = [
    ...new Set([...inputs, ...descriptions.flatMap((item) => [...item.texts, ...item.exclusions])]),
  ]
  const vectors = await options.embed(texts.map((text) => `task: classification | query: ${text}`))
  const dimensions = vectors[0]?.length ?? 0
  if (
    dimensions === 0 ||
    vectors.length !== texts.length ||
    vectors.some((vector) => vector.length !== dimensions || !vector.every(Number.isFinite))
  ) {
    throw new Error('EmbeddingGemma 2 returned invalid embeddings')
  }
  const indexed = new Map(texts.map((text, index) => [text, vectors[index]]))
  return Object.fromEntries(
    descriptions.map(({binding, exclusions, texts: samples}) => [
      binding.id,
      Math.max(
        ...inputs.map((text) => {
          const input = indexed.get(text)!
          const positive = Math.max(
            ...samples.map((sample) => similarity(input, indexed.get(sample)!)),
          )
          const negative = Math.max(
            -1,
            ...exclusions.map((sample) => similarity(input, indexed.get(sample)!)),
          )
          return exclusions.length > 0 && negative >= positive ? -1 : positive
        }),
      ),
    ]),
  )
}
