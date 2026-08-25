/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

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
  default: (props: {pathname: string}) => (
    <output data-testid="dev-dispatcher">{props.pathname}</output>
  ),
}))

it('should return a 404 page with a route back to Pomofi', () => {
  routerMocks.pathname = '/missing'
  render(() => <NotFoundPage />)

  expect(screen.getByTestId('http-status').textContent).toBe('404')
  expect(screen.getByRole('heading', {name: '페이지를 찾을 수 없어요'})).toBeTruthy()
  expect(screen.getByRole('link', {name: 'Pomofi로 돌아가기'}).getAttribute('href')).toBe('/')
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
