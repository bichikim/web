import type {SemanticBinding, SemanticLanguageExamples} from './semantics'

/** Mirrors the first language for older consumers while keeping the full list authoritative. */
export const withSemanticExamples = (
  binding: SemanticBinding,
  examples: readonly SemanticLanguageExamples[],
): SemanticBinding => ({
  ...binding,
  examples,
  excludeText: examples[0]?.excludeText,
  text: examples[0]?.text ?? '',
})
