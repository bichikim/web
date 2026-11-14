/** @vitest-environment jsdom */
import {Route, Router} from '@solidjs/router'
import {cleanup, render, screen} from '@solidjs/testing-library'
import * as m from '@paraglide/message'
import {createSignal} from 'solid-js'
import type {VersionCatalog, VersionRelease} from 'src/features/version-catalog'
import {afterEach, expect, it, vi} from 'vitest'
import {VersionCatalogDocument} from '../Document'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it.each([
  {changes: [{description: 'New capability'}]},
  {changes: [], summary: 'Summary only'},
  {changes: [], notes: ['Notes only']},
])('should omit the initial explanation when body content exists: %j', (body) => {
  const release: VersionRelease = {
    ...body,
    releasedAt: '2026-08-25T05:26:00+09:00',
    title: 'Release',
    version: '2026. 08. 25 05:26',
  }
  render(() => (
    <Router>
      <Route
        path="*"
        component={() => <VersionCatalogDocument catalog={{releases: [release]}} />}
      />
    </Router>
  ))
  expect(screen.queryByText(m.version_notice_initial_release())).not.toBeInTheDocument()
})

it('should update the explanation when release content changes on the same mount', () => {
  const initial: VersionRelease = {
    changes: [],
    releasedAt: '2026-08-25T05:26:00+09:00',
    title: 'Release',
    version: '2026. 08. 25 05:26',
  }
  const [catalog, setCatalog] = createSignal<VersionCatalog>({releases: [initial]})
  render(() => (
    <Router>
      <Route path="*" component={() => <VersionCatalogDocument catalog={catalog()} />} />
    </Router>
  ))
  expect(screen.getByText(m.version_notice_initial_release())).toBeVisible()
  setCatalog({releases: [{...initial, summary: 'Added summary'}]})
  expect(screen.getByText('Added summary')).toBeVisible()
  expect(screen.queryByText(m.version_notice_initial_release())).not.toBeInTheDocument()
  setCatalog({releases: [{...initial, notes: []}]})
  expect(screen.getByText(m.version_notice_initial_release())).toBeVisible()
})

it('should list release notes and provide a return link', () => {
  render(() => (
    <Router>
      <Route
        path="*"
        component={() => (
          <>
            <VersionCatalogDocument
              catalog={{
                releases: [
                  {
                    changes: [{description: '첫 기능'}],
                    releasedAt: '2026-09-06',
                    title: '출시',
                    version: '1.0.0',
                  },
                ],
              }}
            />
          </>
        )}
      />
    </Router>
  ))
  expect(screen.getByRole('heading', {name: '출시'})).toBeVisible()
  expect(screen.getByRole('listitem')).toHaveTextContent('첫 기능')
  expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/')
})
