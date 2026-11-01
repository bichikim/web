import legacy from '../legacy-bindings.json'
import {builtinConnectionProfile} from '../builtin-profile'
import {
  type SemanticBinding,
  semanticBindingsSchema,
} from '@winter-love/wallpaper/settings/semantics'
import {expect, it} from 'vitest'
import {migrateSemanticActions} from '../migrate-semantic-actions'

it('should migrate known preset outputs once while preserving text, thresholds and custom mappings', () => {
  const note: SemanticBinding = {
    enabled: true,
    id: 'ash:notes',
    mode: 'toggle',
    parameterId: 'Param89',
    text: '제가 직접 작성했어요',
    threshold: 0.87,
  }
  const custom = {...note, id: 'custom', parameterId: 'custom-parameter'}
  const migrated = migrateSemanticActions([
    note,
    {...note, id: 'ash:notes-Param75', parameterId: 'Param75'},
    custom,
  ])
  expect(migrated).toEqual([
    {
      ...note,
      action: {id: '노트 들기', kind: 'expression'},
      category: 'behavior',
      exclusiveGroup: '손동작',
      parameterId: null,
    },
    custom,
  ])
  expect(migrateSemanticActions(migrated)).toBe(migrated)
  expect(migrateSemanticActions([custom])[0]).toBe(custom)
})

it('should update untouched builtins once while preserving edited thresholds and intentionally cleared groups', () => {
  const old = semanticBindingsSchema.parse(legacy)
  const current = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  const migrated = migrateSemanticActions(old)
  expect(migrated).toEqual(current)
  expect(migrateSemanticActions(migrated)).toBe(migrated)
  const custom = [{...current[0]!, exclusiveGroup: undefined, text: '사용자 문구', threshold: 0.95}]
  expect(migrateSemanticActions(custom)).toBe(custom)
})
