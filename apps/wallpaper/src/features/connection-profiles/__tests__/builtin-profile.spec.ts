import {expect, it} from 'vitest'
import {builtinConnectionProfile} from '../builtin-profile'

it('should connect all 27 character presets and walking without individual parameter bindings', () => {
  const bindings = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  expect(bindings).toHaveLength(28)
  expect(new Set(bindings.map((binding) => binding.action?.id)).size).toBe(28)
  expect(new Set(bindings.map((binding) => binding.text)).size).toBe(28)
  expect(
    bindings.every((binding) => binding.action !== undefined && binding.parameterId === null),
  ).toBe(true)
  expect(bindings.find((binding) => binding.id === 'ash:notes')?.action).toEqual({
    id: '노트 들기',
    kind: 'expression',
  })
  expect(bindings.find((binding) => binding.id === 'ash:sad-tears')?.excludeText).toContain(
    '울지는 않았어요',
  )
})
