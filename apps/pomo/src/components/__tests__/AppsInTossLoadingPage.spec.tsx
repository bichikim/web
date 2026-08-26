/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {Title} from '@solidjs/meta'
import {AppsInTossLoadingPage} from '../AppsInTossLoadingPage'

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))

it('should render the Apps in Toss loading status and title', () => {
  vi.mocked(Title).mockImplementation((props) => <title>{props.children}</title>)

  render(() => <AppsInTossLoadingPage />)

  expect(Title).toHaveBeenCalledOnce()
  expect(screen.getByRole('status')).toHaveTextContent('Pomofi')
})
