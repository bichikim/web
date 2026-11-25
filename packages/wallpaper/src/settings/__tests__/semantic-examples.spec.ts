import {expect, it} from 'vitest'
import {semanticExamples} from '../semantic-examples'
import type {SemanticBinding} from '../semantics'
const binding: SemanticBinding = {
  enabled: true,
  id: 'happy',
  mode: 'toggle',
  parameterId: null,
  text: 'Legacy text',
  threshold: 0.8,
}

it('should preserve legacy text and treat an explicit empty list as cleared', () => {
  expect(semanticExamples(binding)).toEqual([
    {excludeText: undefined, language: 'und', text: 'Legacy text'},
  ])
  expect(semanticExamples({...binding, examples: []})).toEqual([])
})
