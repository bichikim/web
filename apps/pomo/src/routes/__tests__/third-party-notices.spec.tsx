/** @vitest-environment jsdom */

import {A} from '@solidjs/router'
import {render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import licenseData from '../../../public/licenses.json' with {type: 'json'}

import ThirdPartyNoticesPage from '../third-party-notices'

vi.mock('@solidjs/router', () => ({A: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(licenseData))),
  )
  vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should report a license fetch failure', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))

  render(() => <ThirdPartyNoticesPage />)

  expect(await screen.findByRole('alert')).toHaveTextContent('라이선스 정보를 불러오지 못했습니다.')
})
