/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {FileRoutes} from '@solidjs/start/router'
import {afterEach, expect, it, vi} from 'vitest'
import App from '../app'

vi.mock('@solidjs/start/router', () => ({FileRoutes: vi.fn()}))
afterEach(() => vi.clearAllMocks())

it('should render the generated route through the application router and suspense root', () => {
  vi.mocked(FileRoutes).mockReturnValue([{component: () => <h1>Current route</h1>, path: '/'}])
  const view = render(() => <App />)
  expect(view.getByRole('heading', {name: 'Current route'})).toBeDefined()
})
