/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {DEFAULT_BACKGROUND} from 'src/features/background'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {synchronizeDesktopBackground} from 'src/features/desktop-mode'
import {Website} from '../Website'

vi.mock('src/features/desktop-mode', () => ({
  synchronizeDesktopBackground: vi.fn(async () => undefined),
}))

afterEach(() => vi.clearAllMocks())

it('should update the URL field when the website preference changes', () => {
  const [preferences, setPreferences] = createSignal({
    ...DEFAULT_BACKGROUND,
    mode: 'website' as const,
    websiteUrl: 'https://first.example',
  })
  const background = {...createBackground(), preferences}
  render(() => <Website background={background} />)

  const input = screen.getByRole('textbox', {name: '웹사이트 주소'})
  expect(input).toHaveValue('https://first.example')

  fireEvent.input(input, {target: {value: 'https://draft.example'}})
  setPreferences((value) => ({...value, pairPhotos: !value.pairPhotos}))
  expect(input).toHaveValue('https://draft.example')

  fireEvent.input(input, {target: {value: 'http://insecure.example'}})
  fireEvent.click(screen.getByRole('button', {name: '적용'}))
  expect(screen.getByText('HTTPS 주소를 입력해 주세요.')).toBeInTheDocument()

  setPreferences((value) => ({...value, websiteUrl: 'https://second.example'}))
  expect(input).toHaveValue('https://second.example')
  expect(screen.queryByText('HTTPS 주소를 입력해 주세요.')).not.toBeInTheDocument()
})

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
