/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {Meta, Title} from '@solidjs/meta'
import {useCurrentMatches, useLocation} from '@solidjs/router'
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PageMeta, resolveAbsoluteUrl} from '../PageMeta'
import {RouteMeta, usePageMeta} from '../RouteMeta'

vi.mock('@solidjs/meta', () => ({
  Meta: vi.fn(),
  Title: vi.fn(),
}))

vi.mock('@solidjs/router', () => ({
  useCurrentMatches: vi.fn(),
  useLocation: vi.fn(),
}))

vi.mock('src/env', () => ({
  getSelfUrl: vi.fn(() => 'https://coong.example/'),
}))

beforeEach(() => {
  vi.mocked(Title).mockImplementation((props) => <span data-testid="title">{props.children}</span>)
  vi.mocked(Meta).mockImplementation((props) => (
    <span data-testid={`meta-${String(props.property)}`}>{String(props.content)}</span>
  ))
  vi.mocked(useLocation).mockReturnValue({pathname: '/music'} as ReturnType<typeof useLocation>)
  vi.mocked(useCurrentMatches).mockReturnValue(
    () =>
      [
        {
          path: '/music',
          route: {
            info: {meta: {description: 'route description', image: '/cover.png', title: 'Music'}},
          },
        },
      ] as unknown as ReturnType<ReturnType<typeof useCurrentMatches>>,
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('resolveAbsoluteUrl', () => {
  it('should preserve absolute URLs and resolve relative paths', () => {
    expect(resolveAbsoluteUrl('https://cdn.example/cover.png')).toBe(
      'https://cdn.example/cover.png',
    )
    expect(resolveAbsoluteUrl('cover.png')).toBe('https://coong.example/cover.png')
    expect(resolveAbsoluteUrl(undefined)).toBeUndefined()
  })
})

describe('PageMeta', () => {
  it('should render title and Open Graph values for the current page', () => {
    render(() => <PageMeta title="Page" description="Description" image="https://cdn/image.png" />)

    expect(screen.getByTestId('title')).toHaveTextContent('Coong - Page')
    expect(screen.getByTestId('meta-og:url')).toHaveTextContent('https://coong.example/music')
    expect(screen.getByTestId('meta-og:image')).toHaveTextContent('https://cdn/image.png')
  })
})

describe('RouteMeta', () => {
  it('should select matching route metadata and allow prop overrides', () => {
    createRoot((dispose) => {
      expect(usePageMeta()()).toMatchObject({title: 'Music'})
      dispose()
    })

    render(() => <RouteMeta title="Override" />)

    expect(screen.getByTestId('title')).toHaveTextContent('Coong - Override')
    expect(screen.getByTestId('meta-og:description')).toHaveTextContent('route description')
    expect(screen.getByTestId('meta-og:image')).toHaveTextContent('https://coong.example/cover.png')
  })
})
