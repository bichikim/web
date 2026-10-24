/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {FileRoutes} from '@solidjs/start/router'
import {MetaProvider, Title} from '@solidjs/meta'
import {Router} from '@solidjs/router'
import {afterEach, describe, expect, it, vi} from 'vitest'
import App from '../app'

vi.mock('@solidjs/router', () => ({Router: vi.fn()}))
vi.mock('@solidjs/start/router', () => ({FileRoutes: vi.fn()}))
vi.mock('@solidjs/meta', () => ({MetaProvider: vi.fn(), Title: vi.fn()}))

describe('App', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render file routes through the application root', () => {
    vi.mocked(Router).mockImplementation((props) =>
      props.root?.({children: <p>Current route</p>} as never),
    )
    vi.mocked(MetaProvider).mockImplementation((props) => props.children)
    vi.mocked(Title).mockReturnValue(null)
    vi.mocked(FileRoutes).mockReturnValue([])

    const view = render(() => <App />)

    expect(view.getByText('Current route')).toBeDefined()
    expect(Title).toHaveBeenCalled()
  })
})
