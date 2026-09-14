/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

const healthMocks = vi.hoisted(() => ({checkSystemHealth: vi.fn()}))

vi.mock('src/features/system-health', () => healthMocks)

import {PHealthCheck} from '../PHealthCheck'

beforeEach(() => {
  vi.clearAllMocks()
})

it('should run both checks and present their independent results', async () => {
  healthMocks.checkSystemHealth.mockResolvedValue({
    api: 'healthy',
    serverFunction: 'unhealthy',
  })
  render(() => <PHealthCheck />)

  const button = screen.getByRole('button', {name: '헬스 체크'})
  expect(button.classList.contains('min-h-control-sm')).toBe(true)
  expect(screen.getByText('확인 전')).toBeInTheDocument()

  fireEvent.click(button)

  expect(button).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('확인 중…')
  await waitFor(() => expect(healthMocks.checkSystemHealth).toHaveBeenCalledOnce())
  await waitFor(() => expect(button).not.toBeDisabled())
  expect(screen.getByText('API 정상')).toBeInTheDocument()
  expect(screen.getByText('서버 함수 실패')).toBeInTheDocument()
})

it('should allow a health check to be run again', async () => {
  healthMocks.checkSystemHealth.mockResolvedValue({api: 'healthy', serverFunction: 'healthy'})
  render(() => <PHealthCheck />)

  const button = screen.getByRole('button', {name: '헬스 체크'})
  fireEvent.click(button)
  await waitFor(() => expect(button).not.toBeDisabled())
  fireEvent.click(button)
  await waitFor(() => expect(healthMocks.checkSystemHealth).toHaveBeenCalledTimes(2))
})

it('should present both paths as failed after an unexpected check error', async () => {
  healthMocks.checkSystemHealth.mockRejectedValue(new Error('unexpected'))
  render(() => <PHealthCheck />)

  const button = screen.getByRole('button', {name: '헬스 체크'})
  fireEvent.click(button)

  await waitFor(() => expect(button).not.toBeDisabled())
  expect(screen.getByText('API 실패')).toBeInTheDocument()
  expect(screen.getByText('서버 함수 실패')).toBeInTheDocument()
})
