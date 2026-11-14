/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {batch, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {WebsiteWallpaper} from '@winter-love/wallpaper/settings/model'
import {SWebsiteCustomization} from '../SWebsiteCustomization'

afterEach(cleanup)

const original: WebsiteWallpaper = {
  css: 'body { color: black; }',
  mode: 'website',
  script: 'document.title = "original";',
  url: 'https://example.com/',
}
const setup = () => {
  const [content, setContent] = createSignal(original)
  const [monitor, setMonitor] = createSignal('first')
  const apply = vi.fn(async (next: WebsiteWallpaper) => {
    setContent(next)
  })
  render(() => <SWebsiteCustomization content={content()} monitorId={monitor()} onApply={apply} />)
  fireEvent.click(screen.getByText('사용자 코드'))
  return {apply, setContent, setMonitor}
}

it('should preserve an edited field and synchronize untouched code on a same-site refresh', () => {
  const {setContent} = setup()
  const css = screen.getByRole('textbox', {name: '사용자 CSS'})
  fireEvent.input(css, {target: {value: 'body { color: blue; }'}})
  setContent({...original, css: 'body { color: red; }', script: 'document.title = "refreshed";'})
  expect(css).toHaveValue('body { color: blue; }')
  expect(screen.getByRole('textbox', {name: '로드 완료 후 스크립트'})).toHaveValue(
    'document.title = "refreshed";',
  )
})

it('should retain an empty code edit when the previous save rolls back', () => {
  const {setContent} = setup()
  const css = screen.getByRole('textbox', {name: '사용자 CSS'})
  fireEvent.input(css, {target: {value: 'body { color: red; }'}})
  fireEvent.click(screen.getByRole('button', {name: '저장 후 새로고침'}))
  fireEvent.input(css, {target: {value: ''}})
  setContent(original)
  expect(css).toHaveValue('')
  expect(screen.getByRole('button', {name: '저장 후 새로고침'})).toBeEnabled()
})

it('should restore code without later edits when its optimistic save rolls back', () => {
  const {setContent} = setup()
  const css = screen.getByRole('textbox', {name: '사용자 CSS'})
  fireEvent.input(css, {target: {value: 'body { color: red; }'}})
  fireEvent.click(screen.getByRole('button', {name: '저장 후 새로고침'}))
  setContent(original)
  expect(css).toHaveValue(original.css)
  expect(screen.getByRole('button', {name: '저장 후 새로고침'})).toBeDisabled()
})

it('should reset unsaved code when the selected monitor changes at the same URL', () => {
  const {setContent, setMonitor} = setup()
  const css = screen.getByRole('textbox', {name: '사용자 CSS'})
  fireEvent.input(css, {target: {value: 'body { color: blue; }'}})
  batch(() => {
    setMonitor('second')
    setContent({...original})
  })
  expect(css).toHaveValue(original.css)
  expect(screen.getByRole('button', {name: '저장 후 새로고침'})).toBeDisabled()
})
