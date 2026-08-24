/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import NotFoundPage from 'src/routes/[...404]'

vi.mock('@solidjs/meta', () => ({
  Title: () => null,
}))

vi.mock('@solidjs/router', () => ({
  A: (props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}))

vi.mock('@solidjs/start', () => ({
  HttpStatusCode: (props: {code: number}) => (
    <output data-testid="http-status">{props.code}</output>
  ),
}))

it('should return a 404 page with a route back to Pomofi', () => {
  render(() => <NotFoundPage />)

  expect(screen.getByTestId('http-status').textContent).toBe('404')
  expect(screen.getByRole('heading', {name: '페이지를 찾을 수 없어요'})).toBeTruthy()
  expect(screen.getByRole('link', {name: 'Pomofi로 돌아가기'}).getAttribute('href')).toBe('/')
})
