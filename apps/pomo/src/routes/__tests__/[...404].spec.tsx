/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import NotFoundPage from 'src/routes/[...404]'

const routerMocks = vi.hoisted(() => ({pathname: '/missing'}))

vi.mock('@solidjs/meta', () => ({
  Title: () => null,
}))

vi.mock('@solidjs/router', () => ({
  A: (props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
  useLocation: () => ({pathname: routerMocks.pathname}),
}))

vi.mock('@solidjs/start', () => ({
  HttpStatusCode: (props: {code: number}) => (
    <output data-testid="http-status">{props.code}</output>
  ),
}))

vi.mock('src/components/dev/PageDispatcher', () => ({
  default: (props: {fallback: JSX.Element; pathname: string}) => (
    <>
      <span hidden>{props.fallback}</span>
      <output data-testid="dev-dispatcher">{props.pathname}</output>
    </>
  ),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

it('should return a 404 page with a route back to Pomofi', () => {
  routerMocks.pathname = '/missing'
  render(() => <NotFoundPage />)

  expect(screen.getByTestId('http-status').textContent).toBe('404')
  expect(screen.getByRole('heading', {name: '페이지를 찾을 수 없어요'})).toBeTruthy()
  expect(screen.getByRole('link', {name: '앱으로 돌아가기'}).getAttribute('href')).toBe('/')
})

it('should dispatch a development URL from the catch-all route in development', async () => {
  routerMocks.pathname = '/dev/chat'
  render(() => <NotFoundPage />)

  expect((await screen.findByTestId('dev-dispatcher')).textContent).toBe('/dev/chat')
})

it('should not dispatch a non-development URL with the same prefix', () => {
  routerMocks.pathname = '/developer'
  render(() => <NotFoundPage />)

  expect(screen.getByTestId('http-status').textContent).toBe('404')
})

it('should normalize a slash-only path to the root fallback', () => {
  routerMocks.pathname = '////'
  render(() => <NotFoundPage />)

  expect(screen.getByTestId('http-status').textContent).toBe('404')
})

it('should keep development URLs on the 404 page in production', async () => {
  vi.stubEnv('DEV', false)
  vi.resetModules()
  routerMocks.pathname = '/dev/chat'
  const {default: ProductionNotFoundPage} = await import('../[...404]')

  render(() => <ProductionNotFoundPage />)

  expect(screen.getByTestId('http-status').textContent).toBe('404')
  expect(screen.queryByTestId('dev-dispatcher')).not.toBeInTheDocument()
})
