import type {
  SemanticBinding,
  SemanticLanguageExamples,
} from '@winter-love/wallpaper/settings/semantics'
import {withSemanticExamples} from '@winter-love/wallpaper/settings/with-semantic-examples'
import ash from './ash.json'
import korean from './examples/ko.json'

const defaults = new Map(ash.connections.semanticBindings.map((binding) => [binding.id, binding]))
const translations = new Map(korean.map((example) => [example.id, example]))

/** Makes stock bilingual examples editable once, retaining every explicitly saved language list. */
export const migrateSemanticExamples = (binding: SemanticBinding): SemanticBinding => {
  if (binding.examples !== undefined) {
    return binding
  }
  const original = defaults.get(binding.id)
  const translated = translations.get(binding.id)
  if (original === undefined || translated === undefined) {
    return binding
  }
  const positive = binding.text === original.text
  const negative = (binding.excludeText ?? '') === (original.excludeText ?? '')
  const primary: SemanticLanguageExamples = {
    excludeText: binding.excludeText,
    language: positive ? 'en' : 'und',
    text: binding.text,
  }
  return withSemanticExamples(binding, [
    primary,
    ...(positive || negative
      ? [
          {
            excludeText: negative ? translated.excludeText : undefined,
            language: 'ko',
            text: positive ? translated.text : '',
          },
        ]
      : []),
  ])
}
