/** @vitest-environment jsdom */

import {createMemoryHistory, MemoryRouter, useAction, useSubmission} from '@solidjs/router'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {signOutAdminSession} from '../session'

vi.mock('../session', () => ({signOutAdminSession: vi.fn()}))

import {signOutAdminSessionAction} from '../../auth/actions'
import {useAdminDashboard} from '../use-admin-dashboard'

const DashboardFeedback = () => {
  const dashboard = useAdminDashboard()

  return <Show when={dashboard.errorMessage()}>{(message) => <p role="alert">{message()}</p>}</Show>
}

const RouterRoot = () => {
  const [hasCompleted, setHasCompleted] = createSignal(false)
  const [isDashboardVisible, setIsDashboardVisible] = createSignal(true)
  const signOut = useAction(signOutAdminSessionAction)
  const submission = useSubmission(signOutAdminSessionAction)

  const submit = async () => {
    await signOut(new FormData())
    setHasCompleted(true)
  }

  return (
    <>
      <button onClick={submit}>로그아웃</button>
      <button onClick={() => setIsDashboardVisible((isVisible) => !isVisible)}>화면 전환</button>
      <Show when={hasCompleted()}>
        <p>요청 완료</p>
      </Show>
      <Show when={submission.result}>
        <p data-testid="submission-result">보존된 결과</p>
      </Show>
      <Show when={isDashboardVisible()}>
        <DashboardFeedback />
      </Show>
    </>
  )
}

it('should clear a successful sign-out result before a no-op navigation', async () => {
  vi.mocked(signOutAdminSession).mockResolvedValue(true)
  const history = createMemoryHistory()
  history.set({replace: true, value: '/admin/login'})
  render(() => <MemoryRouter history={history} root={RouterRoot} />)

  fireEvent.click(screen.getByRole('button', {name: '로그아웃'}))
  await screen.findByText('요청 완료')
  expect(history.get()).toBe('/admin/login')
  expect(screen.queryByTestId('submission-result')).toBeNull()

  fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))
  fireEvent.click(screen.getByRole('button', {name: '화면 전환'}))

  await waitFor(() => expect(screen.queryByTestId('submission-result')).toBeNull())
})
