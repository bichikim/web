import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createDemoDocument} from '@winter-love/puppet/player'
import {createSettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {afterAll, afterEach, expect, test, vi} from 'vitest'
import {SPoffoWidgetSettings} from '../../src/components/SPoffoWidgetSettings'
import {useWallpaper} from '../../src/features/settings'
import {useWallpaperLibrary} from '../../src/features/library'
import {importPoffoAsset} from '../../src/features/poffo/import-poffo-asset'
import 'virtual:uno.css'

const source = JSON.stringify(createDemoDocument())
const file = (name: string) => new File([source], name, {type: 'application/json'})
const assets = createSettingsRepository('wallpaper-settings')
const library = createLibraryRepository('wallpaper-library')

afterAll(() => {
  assets.close()
  library.close()
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await Promise.all((await library.read()).widgets.map((widget) => library.removeWidget(widget.id)))
  await Promise.all((await assets.listPuppets()).map((asset) => assets.removePuppet(asset.id)))
})

const mountSettings = async () => {
  const existing = await importPoffoAsset(file('B.json'))
  await library.addWidget(existing.id)
  const view = render(() => {
    const controller = useWallpaper()
    const widgets = useWallpaperLibrary()
    return <SPoffoWidgetSettings controller={controller} library={widgets} />
  })
  await expect
    .poll(() => screen.getByRole('region', {name: 'Poffo 불러오기'}).textContent)
    .toContain('B.json')
  fireEvent.click(screen.getByRole('button', {name: 'Poffo 불러오기'}))
  return {existing, view}
}

const holdFile = (name: string) => {
  const release = Promise.withResolvers<void>()
  const started = Promise.withResolvers<void>()
  const original = File.prototype.text
  vi.spyOn(File.prototype, 'text').mockImplementation(async function holdFile(this: File) {
    if (this.name === name) {
      started.resolve()
      await release.promise
    }
    return original.call(this)
  })
  return {release: release.resolve, started: started.promise}
}

const importFile = (name: string) => {
  const dialog = screen.getByRole('dialog', {name: 'Poffo 불러오기'})
  fireEvent.change(dialog.querySelector('input[type=file]')!, {target: {files: [file(name)]}})
}

const selectAsset = (name: string) => {
  fireEvent.click(screen.getByRole('combobox', {name: '위젯 Poffo'}))
  fireEvent.click(screen.getByRole('option', {name}))
}

const assertStored = async (names: string[]) => {
  await expect
    .poll(async () => (await assets.listPuppets()).map((asset) => asset.name).sort())
    .toEqual(names.toSorted())
  const sources = await Promise.all(
    (await assets.listPuppets()).map((asset) => assets.loadPuppet(asset.id)),
  )
  expect(sources).toEqual(names.map(() => source))
}

const assertWidget = async (assetId: string) => {
  fireEvent.click(screen.getByRole('button', {name: '위젯으로 띄우기'}))
  await expect.poll(async () => (await library.read()).widgets).toHaveLength(2)
  const widgets = (await library.read()).widgets
  expect(widgets.every((widget) => widget.assetId === assetId)).toBe(true)
}

test('should retain a manual asset selection when an earlier valid JSON import finishes', async () => {
  const {existing} = await mountSettings()
  const held = holdFile('A.json')
  importFile('A.json')
  await held.started
  selectAsset('Poffo 샘플')
  selectAsset('B.json')
  held.release()
  await assertStored(['A.json', 'B.json'])
  expect.soft(screen.getByRole('combobox', {name: '위젯 Poffo'}).textContent).toContain('B.json')
  await assertWidget(existing.id)
})

test('should retain the latest valid import and store both files when reads finish in reverse order', async () => {
  await mountSettings()
  const held = holdFile('A.json')
  importFile('A.json')
  await held.started
  importFile('C.json')
  await assertStored(['B.json', 'C.json'])
  await expect
    .poll(() => screen.getByRole('combobox', {name: '위젯 Poffo'}).textContent)
    .toContain('C.json')
  held.release()
  await assertStored(['A.json', 'B.json', 'C.json'])
  expect.soft(screen.getByRole('combobox', {name: '위젯 Poffo'}).textContent).toContain('C.json')
  const latest = (await assets.listPuppets()).find((asset) => asset.name === 'C.json')!
  fireEvent.click(screen.getByRole('button', {name: '위젯으로 띄우기'}))
  await expect.poll(async () => (await library.read()).widgets).toHaveLength(2)
  expect(
    (await library.read()).widgets.filter((widget) => widget.assetId === latest.id),
  ).toHaveLength(1)
})

test('should finish importing after closing and reopening the picker', async () => {
  await mountSettings()
  const held = holdFile('A.json')
  importFile('A.json')
  await held.started
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  held.release()
  await assertStored(['A.json', 'B.json'])
  await expect
    .poll(() => screen.getByRole('region', {name: 'Poffo 불러오기'}).textContent)
    .toContain('A.json')
  fireEvent.click(screen.getByRole('button', {name: 'Poffo 불러오기'}))
  expect(screen.getByRole('combobox', {name: '위젯 Poffo'}).textContent).toContain('A.json')
})

test('should store an in-flight import after leaving settings without selecting it when reopened', async () => {
  const {view} = await mountSettings()
  const held = holdFile('A.json')
  importFile('A.json')
  await held.started
  view.unmount()
  held.release()
  await assertStored(['A.json', 'B.json'])
  render(() => {
    const controller = useWallpaper()
    const widgets = useWallpaperLibrary()
    return <SPoffoWidgetSettings controller={controller} library={widgets} />
  })
  await expect
    .poll(() => screen.getByRole('region', {name: 'Poffo 불러오기'}).textContent)
    .toContain('B.json')
  fireEvent.click(screen.getByRole('button', {name: 'Poffo 불러오기'}))
  expect(screen.getByRole('combobox', {name: '위젯 Poffo'}).textContent).toContain('B.json')
  selectAsset('A.json')
  expect(screen.getByRole('combobox', {name: '위젯 Poffo'}).textContent).toContain('A.json')
})

test('should show a current invalid file error and recover on a valid retry', async () => {
  await mountSettings()
  const dialog = screen.getByRole('dialog', {name: 'Poffo 불러오기'})
  fireEvent.change(dialog.querySelector('input[type=file]')!, {
    target: {files: [new File(['{}'], 'invalid.json', {type: 'application/json'})]},
  })
  await expect
    .poll(() => screen.queryByRole('alert')?.textContent)
    .toBe('Poffo 파일을 가져오지 못했어요.')
  expect(screen.getByRole('combobox', {name: '위젯 Poffo'}).textContent).toContain('B.json')
  await assertStored(['B.json'])
  importFile('C.json')
  await assertStored(['B.json', 'C.json'])
  await expect
    .poll(() => screen.getByRole('combobox', {name: '위젯 Poffo'}).textContent)
    .toContain('C.json')
  expect(screen.queryByRole('alert')).toBeNull()
})
