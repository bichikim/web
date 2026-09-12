/** @vitest-environment jsdom */

import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {createMemoryHistory, MemoryRouter, Route} from '@solidjs/router'
import {afterEach, expect, it, vi} from 'vitest'
import {Analytics} from '..'

afterEach(() => {
  cleanup()
  document.head.querySelectorAll('script[data-sdkn]').forEach((script) => script.remove())
  delete window.va
  delete window.vaq
  delete window.vam
  vi.unstubAllEnvs()
})

it.each([true, false])(
  'should inject once and track route patterns with DEV=%s',
  async (development) => {
    vi.stubEnv('DEV', development)
    const history = createMemoryHistory()
    history.set({value: '/items/first?token=private'})
    render(() => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <>
            <Analytics />
            {props.children}
          </>
        )}
      >
        <Route path="/items/:id" component={() => null} />
      </MemoryRouter>
    ))
    expect(document.head.querySelectorAll('script[data-sdkn]')).toHaveLength(1)
    expect(document.head.querySelector('script[data-sdkn]')?.getAttribute('src')).toBe(
      development
        ? 'https://va.vercel-scripts.com/v1/script.debug.js'
        : '/_vercel/insights/script.js',
    )
    expect(
      document.head.querySelector('script[data-sdkn]')?.getAttribute('data-disable-auto-track'),
    ).toBe('1')
    expect(window.vaq).toEqual([['pageview', {path: '/items/first', route: '/items/:id'}]])
    history.set({value: '/items/second'})
    await waitFor(() => expect(window.vaq).toHaveLength(2))
    expect(window.vaq?.at(-1)).toEqual(['pageview', {path: '/items/second', route: '/items/:id'}])
    history.set({value: '/items/second?tab=other#section'})
    await Promise.resolve()
    expect(window.vaq).toHaveLength(2)
    expect(document.head.querySelectorAll('script[data-sdkn]')).toHaveLength(1)
  },
)

it.each(['VITE_POMO_IS_APPS_IN_TOSS', 'VITE_POMO_IS_DESKTOP'])(
  'should skip analytics for %s',
  (target) => {
    vi.stubEnv(target, 'true')
    render(() => <Analytics />)
    expect(window.va).toBeUndefined()
    expect(document.head.querySelector('script[data-sdkn]')).toBeNull()
  },
)
