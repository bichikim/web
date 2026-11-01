import {expect, test} from 'vitest'
import {toggleMenuAction} from '../toggle-menu-action'
import type {SemanticBinding} from '../semantics'

const binding: SemanticBinding = {
  action: {id: 'tiny', kind: 'expression'},
  category: 'menu',
  enabled: true,
  id: 'tiny',
  menuActive: true,
  mode: 'toggle',
  parameterId: null,
  text: '',
  threshold: 0.8,
}

test('should clear conflicting imported checks when the active menu action is switched off', () => {
  const imported = [
    binding,
    {...binding, id: 'second'},
    {...binding, exclusiveGroup: '장식', id: 'glasses'},
  ]
  expect(
    toggleMenuAction(imported, 'tiny')
      .filter((item) => item.menuActive)
      .map((item) => item.id),
  ).toEqual(['glasses'])
})

test('should ignore disabled, unregistered and unavailable connections', () => {
  const disabled = [{...binding, enabled: false}]
  expect(toggleMenuAction(disabled, 'tiny')).toBe(disabled)
  const unregistered = [{...binding, category: 'emotion' as const}]
  expect(toggleMenuAction(unregistered, 'tiny')).toBe(unregistered)
  const empty = [{...binding, actions: []}]
  expect(toggleMenuAction(empty, 'tiny')).toBe(empty)
  expect(toggleMenuAction(disabled, 'missing')).toBe(disabled)
})
