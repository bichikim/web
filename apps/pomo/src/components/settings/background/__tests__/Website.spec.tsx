/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {synchronizeDesktopBackground} from 'src/features/desktop-mode'
import {Website} from '../Website'

vi.mock('src/features/desktop-mode', () => ({
  synchronizeDesktopBackground: vi.fn(async () => undefined),
}))

afterEach(() => vi.clearAllMocks())

it('should save an HTTPS URL and synchronize the desktop background', async () => {
  const background = createBackground()
  render(() => <Website background={background} />)

  fireEvent.input(screen.getByRole('textbox', {name: '웹사이트 주소'}), {
    target: {value: 'https://example.com/dashboard'},
  })
  fireEvent.click(screen.getByRole('button', {name: '적용'}))

  await waitFor(() =>
    expect(background.configure).toHaveBeenCalledWith({
      mode: 'website',
      websiteUrl: 'https://example.com/dashboard',
    }),
  )
  expect(synchronizeDesktopBackground).toHaveBeenCalledOnce()
})

it('should reject a non-HTTPS URL without changing the background', () => {
  const background = createBackground()
  render(() => <Website background={background} />)

  fireEvent.input(screen.getByRole('textbox', {name: '웹사이트 주소'}), {
    target: {value: 'http://example.com'},
  })
  fireEvent.click(screen.getByRole('button', {name: '적용'}))

  expect(background.configure).not.toHaveBeenCalled()
  expect(screen.getByText('HTTPS 주소를 입력해 주세요.')).toBeInTheDocument()
})
