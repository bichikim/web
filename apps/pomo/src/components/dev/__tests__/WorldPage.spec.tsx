/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {WorldPage} from '../WorldPage'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('src/components/world-studio/WorldStudio', () => ({
  WorldStudio: () => <p>world lookdev</p>,
}))

afterEach(() => {
  cleanup()
})

it('should render the 3D world lookdev page', () => {
  render(() => <WorldPage />)

  expect(screen.getByText('world lookdev')).toBeInTheDocument()
  expect(screen.getByRole('link', {name: /실험실 목록/u}).getAttribute('href')).toBe('/dev')
})
