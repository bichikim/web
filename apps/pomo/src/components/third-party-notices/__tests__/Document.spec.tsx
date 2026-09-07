/** @vitest-environment jsdom */
import {Route, Router} from '@solidjs/router'
import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import licenseData from '../../../../public/licenses.json' with {type: 'json'}
import {ThirdPartyNoticesDocument} from '../Document'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should link the contents to the rendered license groups', () => {
  render(() => (
    <Router>
      <Route
        path="*"
        component={() => (
          <>
            <ThirdPartyNoticesDocument licenseData={licenseData} />
          </>
        )}
      />
    </Router>
  ))
  expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('제3자 라이선스')
  const contents = screen.getByRole('navigation')
  for (const group of licenseData.groups) {
    expect(within(contents).getByRole('link', {name: group.title})).toHaveAttribute(
      'href',
      `#${group.id}`,
    )
    expect(document.getElementById(group.id)).toBeInTheDocument()
  }
})
