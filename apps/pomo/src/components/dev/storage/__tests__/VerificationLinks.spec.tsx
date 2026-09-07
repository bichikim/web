/** @vitest-environment jsdom */
import {Route, Router} from '@solidjs/router'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {VerificationLinks} from '../VerificationLinks'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should link each verification workflow to its development page', () => {
  render(() => (
    <Router>
      <Route
        path="*"
        component={() => (
          <>
            <VerificationLinks />
          </>
        )}
      />
    </Router>
  ))
  expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    '/dev/dialogue',
    '/dev/voice',
    '/dev/speech-to-text',
    '/dev/text-mood',
  ])
})
