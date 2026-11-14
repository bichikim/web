import {expect, it} from 'vitest'
import {builtinConnectionProfile} from '../builtin-profile'
import {semanticTargets} from '@winter-love/wallpaper/settings/semantic-targets'

it('should connect all 27 character presets and walking without individual parameter bindings', () => {
  const bindings = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  expect(bindings).toHaveLength(28)
  expect(
    new Set(bindings.flatMap((binding) => semanticTargets(binding).map((action) => action.id)))
      .size,
  ).toBe(28)
  expect(new Set(bindings.map((binding) => binding.text)).size).toBe(28)
  expect(
    bindings.every(
      (binding) => semanticTargets(binding).length > 0 && binding.parameterId === null,
    ),
  ).toBe(true)
  expect(bindings.find((binding) => binding.id === 'ash:notes')?.action).toEqual({
    id: '노트 들기',
    kind: 'expression',
  })
  expect(bindings.find((binding) => binding.id === 'ash:sad-tears')?.excludeText).toContain(
    '울지는 않았어요',
  )
})

it('should reserve contextual props for literal text matching instead of ordinary random gestures', () => {
  const bindings = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  for (const id of ['ash:leash', 'ash:handcuffs', 'ash:knife']) {
    const binding = bindings.find((binding) => binding.id === id)!
    expect(binding.category).toBe('emotion')
    expect(binding.threshold).toBeGreaterThanOrEqual(0.86)
  }
})

it.each([
  ['ash:press-left', '게임패드 들기', '왼손 버튼 누르기'],
  ['ash:press-right', '게임패드 들기', '오른손 버튼 누르기'],
  ['ash:notes-detail', '노트 들기', '필기 동작'],
])('should bundle the required prop with %s', (id, prop, detail) => {
  const binding = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!.find(
    (item) => item.id === id,
  )!
  expect(binding.actions).toEqual([
    {id: prop, kind: 'expression'},
    {id: detail, kind: 'expression'},
  ])
  expect(binding.action).toBeUndefined()
})

it('should reserve the cute miniature pose for the context menu rather than apology matching', () => {
  const binding = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!.find(
    (item) => item.id === 'ash:shrink',
  )!
  expect(binding).toMatchObject({category: 'menu', menuLabel: '귀엽게 작아지기'})
  expect(binding.text).not.toContain('죄송')
})
