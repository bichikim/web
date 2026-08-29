/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {PFeedSettings} from '../PFeedSettings'
import {PFeedSettingsPanel} from '../feed-settings/Panel'

vi.mock('../feed-settings/Panel', () => ({PFeedSettingsPanel: vi.fn()}))

it('should render the feed settings panel', () => {
  vi.mocked(PFeedSettingsPanel).mockImplementation(() => <div>Feed settings</div>)

  render(() => <PFeedSettings />)

  expect(screen.getByText('Feed settings')).toBeInTheDocument()
})
