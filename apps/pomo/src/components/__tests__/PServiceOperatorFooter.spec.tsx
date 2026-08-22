/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {PServiceOperatorFooter} from 'src/components/PServiceOperatorFooter'

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should show the web hosting provider on the web entry screen', () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')

  render(() => <PServiceOperatorFooter placement="entry" />)

  expect(screen.getByRole('contentinfo').textContent).toContain(
    '서울특별시 강남구 자곡로11길 11 301동 818호',
  )
  expect(screen.getByText('호스팅 서비스 제공자: Vercel Inc.')).toBeTruthy()
  expect(screen.getByRole('contentinfo').getAttribute('class')).toContain(
    'bottom-[calc(0.75rem+var(--pomo-safe-area-inset-bottom))]',
  )
})

it('should omit the web hosting provider from the Apps in Toss studio', () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')

  render(() => <PServiceOperatorFooter placement="studio" />)

  expect(screen.queryByText('호스팅 서비스 제공자: Vercel Inc.')).toBeNull()
  expect(screen.getByRole('contentinfo').getAttribute('class')).toContain(
    'bottom-[calc(7rem+var(--pomo-safe-area-inset-bottom))]',
  )
})
