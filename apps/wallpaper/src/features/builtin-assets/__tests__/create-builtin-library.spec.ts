/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {afterEach, expect, it} from 'vitest'
import {createBuiltinLibrary} from '../create-builtin-library'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'

const name = 'builtin-connections-test'
const repositories: ReturnType<typeof createBuiltinLibrary>[] = []
const open = () => {
  const repository = createBuiltinLibrary(name)
  repositories.push(repository)
  return repository
}
afterEach(async () => {
  repositories.forEach((item) => item.close())
  repositories.length = 0
  await Dexie.delete(name)
})

it('should bundle and persist Ash expressions for a new widget across reopen', async () => {
  const repository = open()
  const widget = await repository.addWidget('builtin:ash')
  expect(widget.speech?.semanticBindings).toHaveLength(28)
  repository.close()
  expect((await open().read()).widgets[0]?.speech?.semanticBindings).toEqual(
    widget.speech?.semanticBindings,
  )
})
it('should initialize existing Ash widgets without replacing custom bindings or an explicitly empty list', async () => {
  const legacy = createLibraryRepository(name)
  const original = await legacy.addWidget('builtin:ash')
  await legacy.configureSpeech(original.id, {enabled: false, x: 0.2, y: 0.3})
  const custom = await legacy.addWidget('builtin:ash')
  await legacy.configureConnections(custom.id, {semanticBindings: []})
  legacy.close()
  const widgets = (await open().read()).widgets
  expect(widgets.find((item) => item.id === original.id)?.speech).toMatchObject({
    enabled: false,
    semanticBindings: expect.any(Array),
    x: 0.2,
    y: 0.3,
  })
  expect(widgets.find((item) => item.id === custom.id)?.speech?.semanticBindings).toEqual([])
})
it('should leave other characters unchanged', async () => {
  const widget = await open().addWidget('other')
  expect(widget.speech).toBeUndefined()
})
it('should migrate saved Ash parameter connections without replacing speech or tracking preferences', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  await legacy.configureSpeech(widget.id, {
    enabled: false,
    semanticBindings: [
      {
        enabled: true,
        id: 'ash:sad-tears',
        mode: 'toggle',
        parameterId: 'Param70',
        text: '조용히 울었어요',
        threshold: 0.91,
      },
    ],
    x: 0.2,
    y: 0.3,
  })
  legacy.close()
  const saved = (await open().read()).widgets[0]!
  expect(saved.speech).toMatchObject({
    enabled: false,
    semanticBindings: [
      {
        action: {id: '눈물', kind: 'expression'},
        id: 'ash:sad-tears',
        parameterId: null,
        text: '조용히 울었어요',
        threshold: 0.91,
      },
    ],
    x: 0.2,
    y: 0.3,
  })
  expect((await open().read()).widgets[0]?.speech).toEqual(saved.speech)
})
