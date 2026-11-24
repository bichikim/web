import type {SemanticBinding, SemanticLanguageExamples} from './semantics'

/** Explicit lists own matching, including an empty list; older bindings retain their original text. */
export const semanticExamples = (binding: SemanticBinding): readonly SemanticLanguageExamples[] =>
  binding.examples ?? [{excludeText: binding.excludeText, language: 'und', text: binding.text}]
