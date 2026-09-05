/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {readonly children: unknown}) => <>{props.children}</>,
}))
vi.mock('../user-auth/TossAccount', () => ({TossAccount: () => <p>Toss account</p>}))
vi.mock('../user-auth/WebAccount', () => ({WebAccount: () => <p>Web account</p>}))

beforeEach(() => cleanup())

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.resetModules()
})

it.each([
  [false, 'Web account'],
  [true, 'Toss account'],
] as const)(
  'should render the account page for Toss=%s',
  async (isAppsInToss, accountText) => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', isAppsInToss ? 'true' : '')
    const {AccountPage} = await import('../AccountPage')

    render(() => <AccountPage />)

    expect(screen.getByRole('main')).toHaveClass(
      '[background:var(--pomo-editor-background)]',
      'text-foreground',
    )
    expect(screen.getByRole('main')).toHaveTextContent('Pomo account')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/')
    expect(screen.getByRole('link')).toHaveClass('text-highlight')
    expect(screen.getByRole('main').querySelector('section')).toHaveClass(
      'border-border',
      'bg-surface',
    )
    expect(screen.getByText(accountText)).toBeInTheDocument()
  },
  15_000,
)

it.each([
  ['google', 'Google 캘린더가 연결되었습니다'],
  ['microsoft', 'Microsoft Outlook 캘린더가 연결되었습니다'],
] as const)(
  'should replace account controls with the %s calendar connection success',
  async (provider, heading) => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
    const {AccountPage} = await import('../AccountPage')

    render(() => <AccountPage connectedCalendarProvider={provider} />)

    expect(screen.getByRole('heading', {name: heading})).toBeVisible()
    expect(screen.getByRole('link', {name: 'Pomo로 돌아가기'})).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', {name: 'Pomo로 돌아가기'})).toHaveClass(
      'bg-highlight',
      'rounded-panel-inner',
      'text-background',
    )
    expect(screen.getByRole('link', {name: 'Pomo로 돌아가기'})).not.toHaveClass('rounded-full')
    expect(
      screen.queryByText('이제 Pomo에게 일정에 관해 물어보세요. 질문에 필요한 기간만 읽어요.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Web account')).not.toBeInTheDocument()
  },
)
