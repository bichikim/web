import legacy from '../legacy-bindings.json'
import previous from '../previous-bindings.json'
import examples from '../examples/ko.json'
import {builtinConnectionProfile} from '../builtin-profile'
import {
  type SemanticBinding,
  semanticBindingsSchema,
} from '@winter-love/wallpaper/settings/semantics'
import {expect, it} from 'vitest'
import {migrateSemanticActions} from '../migrate-semantic-actions'

const legacyBinding = (binding: SemanticBinding): SemanticBinding => {
  const {examples, ...previous} = binding
  return previous
}

it('should retain the coat menu when migrating its parameter connection to the authored action', () => {
  const coat = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!.find(
    (binding) => binding.id === 'ash:remove-coat',
  )!
  const migrated = migrateSemanticActions([
    {...coat, action: undefined, menuActive: true, parameterId: 'Param49'},
  ])
  expect(migrated).toEqual([{...coat, menuActive: true}])
  expect(migrateSemanticActions(migrated)).toBe(migrated)
})

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
  expect(migrated.map(legacyBinding)).toEqual([
    {
      ...note,
      action: {id: '노트 들기', kind: 'expression'},
      category: 'behavior',
      exclusiveGroup: 'Hands',
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
  expect(migrated).toEqual(current.filter((binding) => binding.id !== 'ash:remove-coat'))
  expect(migrateSemanticActions(migrated)).toBe(migrated)
  const custom = [{...current[0]!, exclusiveGroup: undefined, text: '사용자 문구', threshold: 0.95}]
  expect(migrateSemanticActions(custom).map(legacyBinding)).toEqual(custom.map(legacyBinding))
})

it('should remove obsolete builtin parameter outputs while retaining valid actions and custom drafts', () => {
  const current = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  const obsolete: SemanticBinding = {
    enabled: true,
    exclusiveGroup: 'ash:wink',
    id: 'ash:wink-left',
    mode: 'toggle',
    parameterId: 'ParamEyeLOpen',
    text: '작은 비밀 하나 알려 드릴게요.',
    threshold: 0.86,
  }
  const draft = {...obsolete, id: 'user-draft', parameterId: null}
  const migrated = migrateSemanticActions([
    current[0]!,
    obsolete,
    {...obsolete, id: 'ash:wink-left-ParamEyeLSmile'},
    {...obsolete, exclusiveGroup: 'ash:head', id: 'ash:agree'},
    draft,
  ])
  expect(migrated).toEqual([current[0], draft])
  expect(migrateSemanticActions(migrated)).toBe(migrated)
})

it('should replace misleading stock descriptions once while preserving user settings and edited text', () => {
  const current = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  const old = semanticBindingsSchema.parse(previous)
  const saved = old.map((binding) => ({
    ...binding,
    category: 'emotion' as const,
    exclusiveGroup: 'ash:hands',
    release: 'next-speech' as const,
  }))
  const migrated = migrateSemanticActions(saved)
  for (const binding of migrated) {
    const preset = current.find((item) => item.id === binding.id)!
    expect(binding.text).toBe(preset.text)
    expect(binding.text).not.toBe(old.find((item) => item.id === binding.id)!.text)
    expect(binding.category).toBe(preset.category)
    expect(binding.exclusiveGroup).toBe('ash:hands')
    expect(binding.release).toBe('next-speech')
  }
  expect(migrateSemanticActions(migrated)).toBe(migrated)
  const leash = saved.find((binding) => binding.id === 'ash:leash')!
  const variant = migrateSemanticActions([
    {...leash, action: undefined, id: 'ash:leash-Param80', parameterId: 'Param80'},
  ])[0]
  expect(variant.text).toBe(current.find((binding) => binding.id === 'ash:leash')!.text)
  expect(variant.category).toBe('emotion')
  const customThreshold = migrateSemanticActions([{...saved[0], threshold: 0.93}])[0]
  expect(customThreshold.threshold).toBe(0.93)
  expect(customThreshold.text).toBe(current.find((item) => item.id === saved[0].id)!.text)
  const custom = [
    {
      ...old[0],
      category: 'behavior' as const,
      exclusiveGroup: '사용자 그룹',
      text: '사용자가 직접 연결한 내용',
    },
  ]
  expect(migrateSemanticActions(custom).map(legacyBinding)).toEqual(custom.map(legacyBinding))
})

it('should preserve user action bundles and explicitly cleared builtin targets', () => {
  const old = semanticBindingsSchema.parse(previous)[0]!
  const bundled = [
    {
      ...old,
      actions: [
        {id: 'smile', kind: 'expression' as const},
        {id: 'Walk:0', kind: 'motion' as const},
      ],
      exclusiveGroup: '사용자 그룹',
    },
    {...old, actions: [], exclusiveGroup: '사용자 그룹', id: 'ash:notes'},
  ]
  expect(migrateSemanticActions(bundled).map(legacyBinding)).toEqual(bundled.map(legacyBinding))
})

it.each([
  ['ash:press-left', '게임패드 들기'],
  ['ash:press-right', '게임패드 들기'],
  ['ash:notes-detail', '노트 들기'],
])(
  'should add the prerequisite to a saved single %s while preserving user settings',
  (id, prerequisite) => {
    const action =
      id === 'ash:notes-detail'
        ? '필기 동작'
        : id === 'ash:press-left'
          ? '왼손 버튼 누르기'
          : '오른손 버튼 누르기'
    const saved: SemanticBinding = {
      action: {id: action, kind: 'expression'},
      category: 'emotion',
      enabled: false,
      exclusiveGroup: '사용자 그룹',
      id,
      mode: 'toggle',
      parameterId: null,
      release: 'next-speech',
      text: '사용자가 작성한 예문',
      threshold: 0.93,
    }
    const migrated = migrateSemanticActions([saved])
    expect(migrated[0]).toMatchObject({
      ...saved,
      action: undefined,
      actions: [{id: prerequisite, kind: 'expression'}, saved.action!],
    })
    expect(migrateSemanticActions(migrated)).toBe(migrated)
    const custom = [{...saved, action: {id: '다른 행동', kind: 'expression' as const}}]
    expect(migrateSemanticActions(custom).map(legacyBinding)).toEqual(custom.map(legacyBinding))
    const bundle = [{...saved, actions: [saved.action!]}]
    expect(migrateSemanticActions(bundle).map(legacyBinding)).toEqual(bundle.map(legacyBinding))
  },
)

it('should replace only stock apology text with the menu-only miniature pose', () => {
  const old = semanticBindingsSchema.parse(previous).find((binding) => binding.id === 'ash:shrink')!
  const saved = {...old, exclusiveGroup: '몸동작', release: 'next-speech' as const, threshold: 0.91}
  const migrated = migrateSemanticActions([saved])
  expect(migrated[0]).toMatchObject({
    category: 'menu',
    exclusiveGroup: 'Body',
    menuLabel: 'Shrink',
    release: 'next-speech',
    threshold: 0.91,
  })
  expect(migrated[0].text).not.toContain('죄송')
  expect(migrateSemanticActions(migrated)).toBe(migrated)
  const edited = [{...saved, exclusiveGroup: '사용자 그룹', text: '사용자가 직접 등록한 내용'}]
  expect(migrateSemanticActions(edited).map(legacyBinding)).toEqual(edited.map(legacyBinding))
})

it('should rename saved default menus and shared groups once while retaining custom names and targets', () => {
  const current = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  const coat = legacyBinding(current.find((binding) => binding.id === 'ash:remove-coat')!)
  const saved = [
    {...coat, exclusiveGroup: '의상', menuActive: true, menuLabel: '외투 벗기'},
    {...coat, exclusiveGroup: '사용자 그룹', id: 'custom', menuLabel: '나만의 외투'},
    {...coat, exclusiveGroup: '의상', id: 'custom-shared', menuLabel: '같은 그룹 동작'},
    {...coat, exclusiveGroup: '다른 그룹', menuLabel: '사용자가 바꾼 이름'},
  ]
  const migrated = migrateSemanticActions(saved)
  expect(migrated[0]).toMatchObject({
    ...saved[0],
    exclusiveGroup: 'Outfit',
    menuLabel: 'Remove Coat',
  })
  expect(migrated[0].action).toBe(saved[0].action)
  expect(migrated[1]).toBe(saved[1])
  expect(migrated[2]).toMatchObject({...saved[2], exclusiveGroup: 'Outfit'})
  expect(legacyBinding(migrated[3])).toEqual(legacyBinding(saved[3]))
  expect(migrateSemanticActions(migrated)).toBe(migrated)
})

it('should translate each unchanged stock example while preserving edited fields and custom connections', () => {
  const preset = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!.find(
    (binding) => binding.id === 'ash:coffee',
  )!
  const previous = examples.find((example) => example.id === preset.id)!
  const saved = {
    ...legacyBinding(preset),
    excludeText: previous.excludeText,
    text: previous.text,
    threshold: 0.97,
  }
  const bindings = [
    saved,
    {...saved, text: '사용자가 직접 쓴 예문'},
    {...saved, excludeText: '사용자가 직접 쓴 제외 예문'},
    {...saved, id: 'my-custom-binding'},
  ]
  const migrated = migrateSemanticActions(bindings)
  expect(migrated[0]).toMatchObject({...saved, excludeText: preset.excludeText, text: preset.text})
  expect(migrated[0].action).toBe(saved.action)
  expect(migrated[1]).toMatchObject({...bindings[1], excludeText: preset.excludeText})
  expect(migrated[2]).toMatchObject({...bindings[2], text: preset.text})
  expect(migrated[3]).toBe(bindings[3])
  expect(migrateSemanticActions(migrated)).toBe(migrated)
})

it('should recalibrate only untouched stock thresholds for bilingual matching', () => {
  const preset = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings![0]!
  const saved = {...legacyBinding(preset), threshold: 0.788}
  expect(migrateSemanticActions([saved])[0]?.threshold).toBe(0.8)
  const customized = [
    {...saved, threshold: 0.9},
    {...saved, text: 'My joy example'},
    {...saved, excludeText: 'My exclusion'},
  ]
  expect(migrateSemanticActions(customized).map(legacyBinding)).toEqual(
    customized.map(legacyBinding),
  )
})
