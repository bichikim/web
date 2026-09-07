/** @vitest-environment jsdom */
import {Route, Router} from '@solidjs/router'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {VersionCatalogDocument} from '../Document'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
                  {changes: ['첫 기능'], releasedAt: '2026-09-06', title: '출시', version: '1.0.0'},
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
