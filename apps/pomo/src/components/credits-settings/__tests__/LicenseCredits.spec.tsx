/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {Route, Router} from '@solidjs/router'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import licenseData from '../../../../public/licenses.json' with {type: 'json'}
import {LicenseCredits} from '../LicenseCredits'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should group software and model license credits', () => {
  render(() => (
    <Router>
      <Route
        path="*"
        component={() => (
          <>
            <LicenseCredits licenseData={licenseData} />
          </>
        )}
      />
    </Router>
  ))
  expect(screen.getByRole('heading', {name: m.credits_open_source()})).toBeVisible()
  expect(screen.getByRole('heading', {name: m.credits_models()})).toBeVisible()
  expect(screen.getByRole('heading', {name: 'SolidJS · SolidStart'})).toBeVisible()
})
