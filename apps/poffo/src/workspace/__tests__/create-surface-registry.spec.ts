/** @vitest-environment jsdom */
import {expect, test} from 'vitest'
import {createSurfaceRegistry} from '../create-surface-registry'

test('should restore the retained surface when a temporary loading outlet is released', () => {
  const registry = createSurfaceRegistry<{readonly owner: 'runtime'}>()
  const retained = {mount: document.createElement('div'), props: {owner: 'runtime' as const}}
  const temporary = {mount: document.createElement('div'), props: {owner: 'runtime' as const}}
  const release = registry.bind(retained)
  const finish = registry.bind(temporary)
  expect(registry.current('runtime')).toBe(temporary)
  finish()
  expect(registry.current('runtime')).toBe(retained)
  release()
  expect(registry.current('runtime')).toBeUndefined()
})
