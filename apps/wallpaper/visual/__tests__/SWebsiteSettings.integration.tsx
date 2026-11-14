import {cleanup, render, screen, waitFor} from '@solidjs/testing-library'
import Dexie from 'dexie'
import {Show} from 'solid-js'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {userEvent} from 'vitest/browser'
import {SWebsiteSettings} from '../../src/components/SWebsiteSettings'
import {useWallpaper, type WallpaperController} from '../../src/features/settings'
import {createSettingsRepository} from '@winter-love/wallpaper/settings/repository'
import 'virtual:uno.css'

const clearStorage = async () => {
  await Promise.all([
    Dexie.delete('wallpaper-media'),
    Dexie.delete('wallpaper-media-builtin'),
    Dexie.delete('wallpaper-settings'),
  ])
}
beforeEach(clearStorage)
afterEach(async () => {
  cleanup()
  await clearStorage()
})

const renderWebsite = async () => {
  let controller: WallpaperController | undefined
  render(() => {
    controller = useWallpaper()
    return (
      <div class="grid w-80 gap-3 p-4">
        <Show when={controller.current()}>
          <SWebsiteSettings controller={controller} />
        </Show>
      </div>
    )
  })
  await waitFor(() => expect(controller?.selectedId()).toBe('browser-preview'))
  return controller!
}

it('should save multiline website code, reopen it, and clear it through settings', async () => {
  const controller = await renderWebsite()
  await controller.setContent({mode: 'website', url: 'https://example.com/'})
  await userEvent.click(screen.getByText('사용자 코드'))
  const css = 'body {\n  background: rgb(20, 30, 40);\n}'
  const scriptStart = 'window.initialized = true;'
  const scriptDom = 'document.body.dataset.dom = "ready";'
  const script = 'document.title = "custom";\ndocument.body.dataset.custom = "yes";'
  await userEvent.fill(screen.getByRole('textbox', {name: '사용자 CSS'}), css)
  await userEvent.fill(screen.getByRole('textbox', {name: '로드 완료 후 스크립트'}), script)
  await userEvent.selectOptions(screen.getByRole('combobox', {name: '스크립트 실행 시점'}), 'start')
  await userEvent.fill(screen.getByRole('textbox', {name: '페이지 시작 전 스크립트'}), scriptStart)
  await userEvent.selectOptions(screen.getByRole('combobox', {name: '스크립트 실행 시점'}), 'dom')
  await userEvent.fill(screen.getByRole('textbox', {name: 'DOM 준비 후 스크립트'}), scriptDom)
  expect(controller.current()?.content).toEqual({mode: 'website', url: 'https://example.com/'})
  await userEvent.click(screen.getByRole('button', {name: '저장 후 새로고침'}))
  const repository = createSettingsRepository('wallpaper-settings')
  try {
    await waitFor(async () =>
      expect((await repository.read())[0]?.content).toEqual({
        css,
        mode: 'website',
        script,
        scriptDom,
        scriptStart,
        url: 'https://example.com/',
      }),
    )
    cleanup()
    const reopened = await renderWebsite()
    await waitFor(() => expect(reopened.current()?.content.mode).toBe('website'))
    await userEvent.click(screen.getByText('사용자 코드'))
    expect(screen.getByRole('textbox', {name: '사용자 CSS'})).toHaveValue(css)
    expect(screen.getByRole('textbox', {name: '로드 완료 후 스크립트'})).toHaveValue(script)
    await userEvent.selectOptions(
      screen.getByRole('combobox', {name: '스크립트 실행 시점'}),
      'start',
    )
    expect(screen.getByRole('textbox', {name: '페이지 시작 전 스크립트'})).toHaveValue(scriptStart)
    await userEvent.fill(screen.getByRole('textbox', {name: '페이지 시작 전 스크립트'}), '')
    await userEvent.selectOptions(screen.getByRole('combobox', {name: '스크립트 실행 시점'}), 'dom')
    expect(screen.getByRole('textbox', {name: 'DOM 준비 후 스크립트'})).toHaveValue(scriptDom)
    await userEvent.fill(screen.getByRole('textbox', {name: 'DOM 준비 후 스크립트'}), '')
    await userEvent.selectOptions(
      screen.getByRole('combobox', {name: '스크립트 실행 시점'}),
      'load',
    )
    await userEvent.fill(screen.getByRole('textbox', {name: '사용자 CSS'}), '')
    await userEvent.fill(screen.getByRole('textbox', {name: '로드 완료 후 스크립트'}), '')
    await userEvent.click(screen.getByRole('button', {name: '저장 후 새로고침'}))
    await waitFor(async () =>
      expect((await repository.read())[0]?.content).toEqual({
        css: '',
        mode: 'website',
        script: '',
        scriptDom: '',
        scriptStart: '',
        url: 'https://example.com/',
      }),
    )
  } finally {
    repository.close()
  }
})
