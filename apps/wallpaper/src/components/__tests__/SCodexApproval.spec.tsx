/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SCodexApproval} from '../SCodexApproval'

const request = {
  cwd: '/project',
  id: 'approval',
  input: {command: 'pwd'},
  sessionId: 'chat',
  tool: 'Bash',
  turnId: 'turn',
}
afterEach(cleanup)
it('should display the exact request and submit only the clicked one-time decision', async () => {
  const pending = Promise.withResolvers<void>()
  const decide = vi.fn(() => pending.promise)
  render(() => <SCodexApproval request={request} onDecide={decide} />)
  expect(screen.getByRole('region', {name: '승인 요청 내용'})).toHaveTextContent('pwd')
  expect(screen.getByText('/project')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '이번만 승인'}))
  expect(decide).toHaveBeenCalledWith('approval', 'allow')
  expect(screen.getByRole('button', {name: '거절'})).toBeDisabled()
  pending.resolve()
  await Promise.resolve()
})
it('should retain a failed request and let the user return it to Codex', async () => {
  const decide = vi
    .fn()
    .mockRejectedValueOnce(new Error('expired'))
    .mockResolvedValueOnce(undefined)
  render(() => <SCodexApproval request={request} onDecide={decide} />)
  fireEvent.click(screen.getByRole('button', {name: '거절'}))
  await Promise.resolve()
  expect(screen.getByRole('alert')).toHaveTextContent('요청이 종료됐거나 연결이 끊겼습니다.')
  fireEvent.click(screen.getByRole('button', {name: 'Codex에서 처리'}))
  expect(decide).toHaveBeenLastCalledWith('approval', 'codex')
})
