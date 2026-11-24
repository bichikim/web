import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {useSemanticExamples} from '../use-semantic-examples'
const initial: SemanticBinding = {
  enabled: true,
  examples: [
    {language: 'en', text: 'Happy'},
    {language: 'ko', text: '기뻐요'},
  ],
  id: 'happy',
  mode: 'toggle',
  parameterId: null,
  text: 'Happy',
  threshold: 0.8,
}
afterEach(() => vi.restoreAllMocks())
it('should retain successive additions while older saves are acknowledged', async () => {
  const [value, setValue] = createSignal(initial)
  let first!: () => void
  let second!: () => void
  const firstSaved = new Promise<void>((resolve) => {
    first = resolve
  })
  const secondSaved = new Promise<void>((resolve) => {
    second = resolve
  })
  const save = vi.fn().mockReturnValueOnce(firstSaved).mockReturnValueOnce(secondSaved)
  const scope = createRoot((dispose) => ({
    dispose,
    editor: useSemanticExamples({onChange: save, preferred: () => 'en', value}),
  }))
  const a = scope.editor.add('ja')
  const b = scope.editor.add('fr')
  expect(save.mock.calls[1][0].examples.map((item: {language: string}) => item.language)).toEqual([
    'en',
    'ko',
    'ja',
    'fr',
  ])
  setValue(save.mock.calls[0][0])
  first()
  await a
  expect(scope.editor.values()).toHaveLength(4)
  setValue(save.mock.calls[1][0])
  second()
  await b
  expect(scope.editor.current()?.language).toBe('fr')
  expect(scope.editor.values()).toHaveLength(4)
  scope.dispose()
})
it('should edit one language, mirror the primary language and permit clearing every language', async () => {
  const [value, setValue] = createSignal(initial)
  const scope = createRoot((dispose) => ({
    dispose,
    editor: useSemanticExamples({onChange: setValue, preferred: () => 'en', value}),
  }))
  scope.editor.select('ko')
  await scope.editor.edit({excludeText: '기쁘지 않아요', text: '정말 기뻐요'})
  expect(value().text).toBe('Happy')
  expect(value().examples?.[1]?.text).toBe('정말 기뻐요')
  scope.editor.select('en')
  await scope.editor.remove()
  expect(value().text).toBe('정말 기뻐요')
  await scope.editor.remove()
  expect(value().examples).toEqual([])
  expect(scope.editor.current()).toBeNull()
  scope.dispose()
})
it('should retain a failed draft for retry and reset selection when a different binding arrives', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const [value, setValue] = createSignal(initial)
  const save = vi.fn().mockRejectedValueOnce(Error('write failed')).mockImplementationOnce(setValue)
  const scope = createRoot((dispose) => ({
    dispose,
    editor: useSemanticExamples({onChange: save, preferred: () => 'en', value}),
  }))
  await scope.editor.add('ja')
  expect(scope.editor.error()).not.toBeNull()
  expect(scope.editor.current()?.language).toBe('ja')
  await scope.editor.retry()
  expect(value().examples).toHaveLength(3)
  expect(scope.editor.error()).toBeNull()
  setValue({...initial, examples: [{language: 'de', text: 'Hallo'}], id: 'other'})
  expect(scope.editor.current()?.language).toBe('de')
  scope.dispose()
})
