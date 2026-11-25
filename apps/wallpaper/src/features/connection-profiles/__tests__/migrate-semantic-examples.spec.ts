import {expect, it} from 'vitest'
import {builtinConnectionProfile} from '../builtin-profile'
import {migrateSemanticExamples} from '../migrate-semantic-examples'
const preset = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings![0]!
const legacy = {...preset, examples: undefined}
it('should expose both stock languages as editable saved examples', () => {
  const migrated = migrateSemanticExamples(legacy)
  expect(migrated.examples?.map((item) => item.language)).toEqual(['en', 'ko'])
  expect(migrated.examples?.[0]?.text).toBe(preset.text)
  expect(migrated.examples?.[1]?.text).toContain('기쁘고 행복해서')
  expect(migrateSemanticExamples(migrated)).toBe(migrated)
})
it('should retain edited fields and never restore a deleted language', () => {
  const edited = migrateSemanticExamples({
    ...legacy,
    excludeText: 'My exclusion',
    text: 'My example',
  })
  expect(edited.examples).toEqual([
    {excludeText: 'My exclusion', language: 'und', text: 'My example'},
  ])
  const koreanOnly = {...preset, examples: [preset.examples![1]!], text: preset.examples![1]!.text}
  expect(migrateSemanticExamples(koreanOnly)).toBe(koreanOnly)
  const cleared = {...preset, examples: []}
  expect(migrateSemanticExamples(cleared)).toBe(cleared)
  const custom = {...legacy, id: 'custom'}
  expect(migrateSemanticExamples(custom)).toBe(custom)
})
