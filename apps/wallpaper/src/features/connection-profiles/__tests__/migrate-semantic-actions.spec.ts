import {expect, it} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
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
    {...note, action: {id: '노트 들기', kind: 'expression'}, parameterId: null},
    custom,
  ])
  expect(migrateSemanticActions(migrated)).toBe(migrated)
  expect(migrateSemanticActions([custom])[0]).toBe(custom)
})
