import {expect, it} from 'vitest'
import {withSemanticExamples} from '../with-semantic-examples'
import {type SemanticBinding, semanticBindingsSchema} from '../semantics'
const binding: SemanticBinding = {
  enabled: true,
  id: 'happy',
  mode: 'toggle',
  parameterId: null,
  text: 'Legacy text',
  threshold: 0.8,
}

it('should retain language-specific examples through settings parsing', () => {
  const examples = [
    {excludeText: 'Not happy', language: 'en', text: 'Happy'},
    {language: 'ko', text: '기뻐요'},
  ]
  const saved = withSemanticExamples(binding, examples)
  expect(semanticBindingsSchema.parse([saved])[0]?.examples).toEqual(examples)
  expect(saved.text).toBe('Happy')
  expect(saved.excludeText).toBe('Not happy')
  expect(withSemanticExamples(saved, [])).toEqual({
    ...binding,
    examples: [],
    excludeText: undefined,
    text: '',
  })
})
