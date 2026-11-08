import {cleanup, render, screen, waitFor} from '@solidjs/testing-library'
import Dexie from 'dexie'
import {Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createMonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import {
  createSettingsRepository,
  type SettingsRepository,
} from '@winter-love/wallpaper/settings/repository'
import {createBuiltinMedia} from '../../src/features/builtin-assets/create-builtin-media'
import {SWebsiteSettings} from '../../src/components/SWebsiteSettings'
import {SSettingsNavigation} from '../../src/components/SSettingsNavigation'
import {SSegmentedControl} from '../../src/components/SSegmentedControl'
import {
  listWallpaperMonitors,
  subscribeWallpaperMonitors,
} from '../../src/features/settings/monitors'
import {useWallpaper, type WallpaperController} from '../../src/features/settings'
import 'virtual:uno.css'

vi.mock('@winter-love/wallpaper/settings/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@winter-love/wallpaper/settings/repository')>()
  return {...actual, createSettingsRepository: vi.fn(actual.createSettingsRepository)}
})

vi.mock('../../src/features/builtin-assets/create-builtin-media', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/features/builtin-assets/create-builtin-media')>()
  return {...actual, createBuiltinMedia: vi.fn(actual.createBuiltinMedia)}
})

vi.mock('../../src/features/settings/monitors', () => ({
  listWallpaperMonitors: vi.fn(),
  subscribeWallpaperMonitors: vi.fn(),
}))

const createRepository = vi.mocked(createSettingsRepository).getMockImplementation()!
const createMedia = vi.mocked(createBuiltinMedia).getMockImplementation()!
const original = {
  css: 'body { color: black; }',
  mode: 'website' as const,
  script: 'document.title = "Original";',
  url: 'https://example.com/',
}
const first = {
  ...original,
  css: 'body { color: red; }',
  script: 'document.title = "First";',
  scriptDom: 'document.body.dataset.stage = "first";',
  scriptStart: 'window.stage = "first";',
}
const second = {
  ...original,
  css: 'body { color: blue; }',
  script: 'document.title = "Second";',
  scriptDom: 'document.body.dataset.stage = "second";',
  scriptStart: 'window.stage = "second";',
}
const databaseName = 'wallpaper-settings-website-drafts'
const clearStorage = () =>
  Promise.all([
    Dexie.delete(databaseName),
    Dexie.delete('wallpaper-media-website-drafts'),
    Dexie.delete('wallpaper-media-website-drafts-builtin'),
  ])

beforeEach(async () => {
  await clearStorage()
  vi.mocked(listWallpaperMonitors).mockResolvedValue([
    {id: 'browser-preview', name: '첫 화면'},
    {id: 'second', name: '다른 화면'},
  ])
  vi.mocked(subscribeWallpaperMonitors).mockResolvedValue(() => undefined)
  vi.mocked(createBuiltinMedia).mockImplementation((name) => createMedia(`${name}-website-drafts`))
  vi.mocked(createSettingsRepository).mockImplementation((name) => {
    const repository = createRepository(name === 'wallpaper-settings' ? databaseName : name)
    return {...repository, save: vi.fn(repository.save)}
  })
  const repository = createRepository(databaseName)
  await repository.save({...createMonitorWallpaper('browser-preview'), content: original})
  await repository.save({
    ...createMonitorWallpaper('second'),
    content: {...original, css: 'body { color: green; }'},
  })
  repository.close()
  vi.mocked(createSettingsRepository).mockClear()
})
afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await clearStorage()
})

const renderWebsite = async () => {
  let controller: WallpaperController | undefined
  render(() => {
    const instance = useWallpaper()
    controller = instance
    instance.setContent = vi.fn(instance.setContent)
    return (
      <div class="grid w-80 gap-3 p-4">
        <SSettingsNavigation>
          {(page) => (
            <Show when={page === 'background' && instance.current()}>
              <SSegmentedControl
                label="모니터"
                options={instance
                  .monitors()
                  .map((monitor) => ({label: monitor.name, value: monitor.id}))}
                value={instance.selectedId() ?? undefined}
                onChange={instance.selectMonitor}
              />
              <SWebsiteSettings controller={instance} />
            </Show>
          )}
        </SSettingsNavigation>
      </div>
    )
  })
  await waitFor(() => expect(controller?.current()?.content.mode).toBe('website'))
  await userEvent.click(screen.getByText('사용자 코드'))
  return controller!
}

const editCode = async (content: typeof first) => {
  await userEvent.fill(screen.getByRole('textbox', {name: '사용자 CSS'}), content.css)
  await userEvent.selectOptions(screen.getByRole('combobox', {name: '스크립트 실행 시점'}), 'load')
  await userEvent.fill(screen.getByRole('textbox', {name: '로드 완료 후 스크립트'}), content.script)
  await userEvent.selectOptions(screen.getByRole('combobox', {name: '스크립트 실행 시점'}), 'start')
  await userEvent.fill(
    screen.getByRole('textbox', {name: '페이지 시작 전 스크립트'}),
    content.scriptStart,
  )
  await userEvent.selectOptions(screen.getByRole('combobox', {name: '스크립트 실행 시점'}), 'dom')
  await userEvent.fill(
    screen.getByRole('textbox', {name: 'DOM 준비 후 스크립트'}),
    content.scriptDom,
  )
}
const expectCode = async (content: typeof first) => {
  expect(screen.getByRole('textbox', {name: '사용자 CSS'})).toHaveValue(content.css)
  expect(screen.getByRole('textbox', {name: 'DOM 준비 후 스크립트'})).toHaveValue(content.scriptDom)
  await userEvent.selectOptions(screen.getByRole('combobox', {name: '스크립트 실행 시점'}), 'start')
  expect(screen.getByRole('textbox', {name: '페이지 시작 전 스크립트'})).toHaveValue(
    content.scriptStart,
  )
  await userEvent.selectOptions(screen.getByRole('combobox', {name: '스크립트 실행 시점'}), 'load')
  expect(screen.getByRole('textbox', {name: '로드 완료 후 스크립트'})).toHaveValue(content.script)
}

it.each(['success', 'failure'] as const)(
  'should retain and explicitly save newer code after an earlier save %s',
  async (result) => {
    const controller = await renderWebsite()
    const repository: SettingsRepository =
      vi.mocked(createSettingsRepository).mock.results[0]!.value
    const save = repository.save
    const gate = Promise.withResolvers<void>()
    const persist = vi.mocked(save).getMockImplementation()!
    vi.mocked(save).mockImplementationOnce(async (settings) => {
      await gate.promise
      if (result === 'failure') {
        throw new Error('IndexedDB write failed')
      }
      await persist(settings)
    })
    const reader = createRepository(databaseName)
    try {
      await editCode(first)
      expect(controller.current()?.content).toEqual(original)
      await userEvent.click(screen.getByRole('button', {name: '저장 후 새로고침'}))
      await waitFor(() => expect(save).toHaveBeenCalledOnce())
      expect(controller.current()?.content).toEqual(first)
      await editCode(second)
      expect(controller.current()?.content).toEqual(first)
      gate.resolve()
      await vi.mocked(controller.setContent).mock.results[0]!.value
      expect(controller.error()).toBe(result === 'failure' ? '설정을 저장하지 못했어요.' : null)
      expect((await reader.read())[0]?.content).toEqual(result === 'success' ? first : original)
      await expectCode(second)
      expect(screen.getByRole('button', {name: '저장 후 새로고침'})).toBeEnabled()
      await userEvent.click(screen.getByRole('button', {name: '저장 후 새로고침'}))
      await vi.mocked(controller.setContent).mock.results[1]!.value
      expect((await reader.read())[0]?.content).toEqual(second)
      expect(controller.error()).toBeNull()
      expect(screen.getByRole('button', {name: '저장 후 새로고침'})).toBeDisabled()
      cleanup()
      await renderWebsite()
      await userEvent.selectOptions(
        screen.getByRole('combobox', {name: '스크립트 실행 시점'}),
        'dom',
      )
      await expectCode(second)
    } finally {
      gate.resolve()
      await Promise.allSettled(
        vi.mocked(controller.setContent).mock.results.map((entry) => entry.value),
      )
      reader.close()
    }
  },
)

it.each(['success', 'failure'] as const)(
  'should reset code on monitor changes and ignore the previous monitor save %s',
  async (result) => {
    const controller = await renderWebsite()
    const repository: SettingsRepository =
      vi.mocked(createSettingsRepository).mock.results[0]!.value
    const persist = vi.mocked(repository.save).getMockImplementation()!
    const gate = Promise.withResolvers<void>()
    vi.mocked(repository.save).mockImplementationOnce(async (settings) => {
      await gate.promise
      if (result === 'failure') {
        throw new Error('IndexedDB write failed')
      }
      await persist(settings)
    })
    try {
      await editCode(first)
      await userEvent.click(screen.getByRole('button', {name: '저장 후 새로고침'}))
      await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())
      await editCode(second)
      await userEvent.click(screen.getByText('다른 화면', {exact: true}))
      expect(screen.getByRole('textbox', {name: '사용자 CSS'})).toHaveValue(
        'body { color: green; }',
      )
      gate.resolve()
      await vi.mocked(controller.setContent).mock.results[0]!.value
      expect(screen.getByRole('textbox', {name: '사용자 CSS'})).toHaveValue(
        'body { color: green; }',
      )
      await userEvent.click(screen.getByText('첫 화면', {exact: true}))
      expect(screen.getByRole('textbox', {name: '사용자 CSS'})).toHaveValue(
        result === 'success' ? first.css : original.css,
      )
    } finally {
      gate.resolve()
      await Promise.allSettled(
        vi.mocked(controller.setContent).mock.results.map((entry) => entry.value),
      )
    }
  },
)

it('should retain a folded draft but discard it when leaving settings without saving', async () => {
  const controller = await renderWebsite()
  await editCode(second)
  await userEvent.click(screen.getByText('사용자 코드'))
  await userEvent.click(screen.getByText('사용자 코드'))
  await expectCode(second)
  await userEvent.click(screen.getByRole('button', {name: '일반'}))
  await userEvent.click(screen.getByRole('button', {name: '배경'}))
  await userEvent.click(screen.getByText('사용자 코드'))
  expect(screen.getByRole('textbox', {name: '사용자 CSS'})).toHaveValue(original.css)
  expect(screen.getByRole('textbox', {name: '로드 완료 후 스크립트'})).toHaveValue(original.script)
  expect(controller.setContent).not.toHaveBeenCalled()
})

it('should reset unsubmitted code when navigating to another website', async () => {
  const controller = await renderWebsite()
  await editCode(second)
  const address = screen.getByRole('textbox', {name: '웹사이트 주소'})
  await userEvent.fill(address, 'https://example.org/')
  await userEvent.keyboard('{Enter}')
  await vi.mocked(controller.setContent).mock.results[0]!.value
  expect(controller.current()?.content).toEqual({...original, url: 'https://example.org/'})
  expect(screen.getByRole('textbox', {name: '사용자 CSS'})).toHaveValue(original.css)
  expect(screen.getByRole('button', {name: '저장 후 새로고침'})).toBeDisabled()
})
