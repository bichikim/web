/** @vitest-environment jsdom */
import {Route, Router} from '@solidjs/router'
import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import licenseData from '../../../../public/licenses.json' with {type: 'json'}
import englishLicenseData from '../../../../public/licenses.en.json' with {type: 'json'}
import {ThirdPartyNoticesDocument} from '../Document'

const originalGetLocale = getLocale

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
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

it('should render the complete notice document in English', () => {
  overwriteGetLocale(() => 'en')
  render(() => (
    <Router>
      <Route
        path="*"
        component={() => <ThirdPartyNoticesDocument licenseData={englishLicenseData} />}
      />
    </Router>
  ))

  expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(
    'Third-party licenses and distribution notices',
  )
  expect(screen.getByRole('heading', {name: 'Core software'})).toBeInTheDocument()
  expect(screen.getByText('User interface and server rendering')).toBeInTheDocument()
  expect(screen.getByText('Original license text takes precedence')).toBeInTheDocument()
  expect(screen.queryByText(/[가-힣]/u)).toBeNull()
})
