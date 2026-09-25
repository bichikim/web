/** @vitest-environment jsdom */

import {createSignal} from 'solid-js'
import {render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {type BackgroundController, DEFAULT_BACKGROUND} from 'src/features/background'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {Website} from '../components/settings/background/Website'

vi.mock('src/features/desktop-mode', () => ({
  synchronizeDesktopBackground: vi.fn(async () => undefined),
}))

it('should show the latest websiteUrl after background preferences change externally', async () => {
  const [websiteUrl, setWebsiteUrl] = createSignal('https://first.example')
  const background: BackgroundController = {
    ...createBackground(),
    preferences: () => ({
      ...DEFAULT_BACKGROUND,
      mode: 'website',
      websiteUrl: websiteUrl(),
    }),
  }

  render(() => <Website background={background} />)

  expect(screen.getByRole('textbox', {name: '웹사이트 주소'})).toHaveValue('https://first.example')

  setWebsiteUrl('https://second.example')

  await waitFor(() =>
    expect(screen.getByRole('textbox', {name: '웹사이트 주소'})).toHaveValue(
      'https://second.example',
    ),
  )
})
