/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {A} from '@solidjs/router'
import {beforeEach, expect, it, vi} from 'vitest'
import {
  readAdminCloudTextUsers,
  resetAdminCloudTextUsage,
  updateAdminCloudTextLimit,
} from 'src/features/admin-cloud-text/api'
import {ADMIN_USER} from 'src/features/admin-cloud-text/__tests__/fixtures/user'
import {PAdminCloudText} from '../PAdminCloudText'

vi.mock('@solidjs/meta', () => ({Title: () => null}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('src/features/admin-cloud-text/api', () => ({
  readAdminCloudTextUsers: vi.fn(),
  resetAdminCloudTextUsage: vi.fn(),
  updateAdminCloudTextLimit: vi.fn(),
}))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
  vi.mocked(readAdminCloudTextUsers).mockResolvedValue({nextCursor: null, users: [ADMIN_USER]})
})
it('should reset today usage and retain the saved daily allowance in the same row', async () => {
  vi.mocked(resetAdminCloudTextUsage).mockResolvedValue({
    kind: 'updated',
    user: {...ADMIN_USER, usage: {...ADMIN_USER.usage, remaining: 3, used: 0}},
  })
  render(() => <PAdminCloudText />)
  fireEvent.click(await screen.findByRole('button', {name: '오늘 사용 초기화'}))
  await waitFor(() => expect(resetAdminCloudTextUsage).toHaveBeenCalledWith(ADMIN_USER.id), {
    interval: 1,
  })
  await waitFor(
    () => expect(screen.getByRole('button', {name: '오늘 사용 초기화'})).toBeDisabled(),
    {interval: 1},
  )
  expect(screen.getByRole('spinbutton')).toHaveValue(3)
  expect(screen.getByText('오늘 사용량을 초기화했어요.')).toBeInTheDocument()
})
it('should save an allowance and render authoritative usage in the same user row', async () => {
  vi.mocked(updateAdminCloudTextLimit).mockResolvedValue({
    kind: 'updated',
    user: {
      ...ADMIN_USER,
      dailyLimitOverride: 5,
      usage: {...ADMIN_USER.usage, limit: 5, remaining: 4},
    },
  })
  render(() => <PAdminCloudText />)
  const limit = await screen.findByRole('spinbutton', {name: `${ADMIN_USER.id} 일일 한도`})
  fireEvent.input(limit, {target: {value: '5'}})
  fireEvent.submit(screen.getByRole('button', {name: '저장'}).closest('form')!)
  await waitFor(() =>
    expect(updateAdminCloudTextLimit).toHaveBeenCalledWith({dailyLimit: 5, userId: ADMIN_USER.id}),
  )
  const row = screen.getByRole('row', {name: new RegExp(ADMIN_USER.id)})
  await waitFor(() => expect(within(row).getByText('4', {exact: true})).toBeInTheDocument())
  expect(within(row).getByText('1', {exact: true})).toBeInTheDocument()
  expect(limit).toHaveValue(5)
  expect(screen.getByText('사용 한도를 저장했어요.')).toBeInTheDocument()
  expect(screen.getByRole('button', {name: '기본값 복원'})).not.toBeDisabled()
})
it('should restore the default through an explicit null override', async () => {
  vi.mocked(readAdminCloudTextUsers).mockResolvedValue({
    nextCursor: null,
    users: [
      {...ADMIN_USER, dailyLimitOverride: 5, usage: {...ADMIN_USER.usage, limit: 5, remaining: 4}},
    ],
  })
  vi.mocked(updateAdminCloudTextLimit).mockResolvedValue({kind: 'updated', user: ADMIN_USER})
  render(() => <PAdminCloudText />)
  const restore = await screen.findByRole('button', {name: '기본값 복원'})
  fireEvent.click(restore)
  await waitFor(() =>
    expect(updateAdminCloudTextLimit).toHaveBeenCalledWith({
      dailyLimit: null,
      userId: ADMIN_USER.id,
    }),
  )
  await waitFor(() => expect(restore).toBeDisabled())
  expect(screen.getByRole('spinbutton')).toHaveValue(3)
})
it('should save unlimited explicitly and show an unlimited remaining allowance', async () => {
  vi.mocked(updateAdminCloudTextLimit).mockResolvedValue({
    kind: 'updated',
    user: {
      ...ADMIN_USER,
      dailyLimitOverride: 'unlimited',
      usage: {...ADMIN_USER.usage, limit: null, remaining: null},
    },
  })
  render(() => <PAdminCloudText />)
  const unlimited = await screen.findByRole('checkbox', {name: '무제한'})
  fireEvent.click(unlimited)
  expect(screen.getByRole('spinbutton')).toBeDisabled()
  fireEvent.submit(screen.getByRole('button', {name: '저장'}).closest('form')!)
  await waitFor(
    () =>
      expect(updateAdminCloudTextLimit).toHaveBeenCalledWith({
        dailyLimit: 'unlimited',
        userId: ADMIN_USER.id,
      }),
    {interval: 1},
  )
  await waitFor(
    () => expect(screen.getByRole('cell', {name: /남은 횟수 무제한/u})).toBeInTheDocument(),
    {
      interval: 1,
    },
  )
  expect(screen.getByRole('checkbox', {name: '무제한'})).toBeChecked()
})
it('should expose a failed read and recover when the administrator refreshes', async () => {
  vi.mocked(readAdminCloudTextUsers)
    .mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValueOnce({nextCursor: null, users: [ADMIN_USER]})
  render(() => <PAdminCloudText />)
  expect(await screen.findByRole('alert')).toHaveTextContent('사용량을 불러오지 못했어요')
  fireEvent.click(screen.getByRole('button', {name: '새로고침'}))
  expect(await screen.findByRole('spinbutton')).toHaveValue(3)
})
