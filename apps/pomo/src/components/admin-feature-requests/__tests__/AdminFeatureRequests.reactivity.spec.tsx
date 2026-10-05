/** @vitest-environment jsdom */
import {Title} from '@solidjs/meta'
import {MemoryRouter, query} from '@solidjs/router'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import {
  listAdminFeatureRequests,
  updateAdminFeatureRequest,
} from '../../../features/feature-requests/api'
import type {FeatureRequest} from '../../../features/feature-requests'
import {AdminFeatureRequests} from '../AdminFeatureRequests'

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('../../../features/feature-requests/api', () => ({
  listAdminFeatureRequests: vi.fn(),
  updateAdminFeatureRequest: vi.fn(),
}))
beforeEach(() => {
  vi.clearAllMocks()
  query.clear()
  vi.mocked(Title).mockImplementation(() => null)
})

it('should preserve the administrator form after saving the same request', async () => {
  const request: FeatureRequest = {
    createdAt: '2026-09-17T01:00:00.000Z',
    description: '설명',
    id: 'request',
    status: 'voting',
    targetVoteCount: 10,
    title: '새 기능',
    voteCount: 2,
    votedByCurrentUser: false,
  }
  vi.mocked(listAdminFeatureRequests).mockResolvedValue({hasMore: false, requests: [request]})
  vi.mocked(updateAdminFeatureRequest).mockResolvedValue({status: 'updated'})
  render(() => <MemoryRouter root={AdminFeatureRequests} />)
  const listRequest = vi.mocked(listAdminFeatureRequests).mock.results[0]?.value
  if (listRequest === undefined) {
    throw new Error('Expected the mocked admin request list to start during render')
  }
  await listRequest
  const input = await screen.findByRole('spinbutton')
  const article = input.closest('article')
  expect(article).not.toBeNull()
  fireEvent.input(input, {target: {value: '15'}})
  input.focus()
  fireEvent.submit(input.closest('form')!)
  expect(updateAdminFeatureRequest).toHaveBeenCalledWith({
    requestId: 'request',
    status: 'voting',
    targetVoteCount: 15,
  })
  const updateRequest = vi.mocked(updateAdminFeatureRequest).mock.results[0]?.value
  if (updateRequest === undefined) {
    throw new Error('Expected the mocked admin request update to start on submit')
  }
  await updateRequest
  await waitFor(() => expect(input).not.toBeDisabled())
  const nextInput = article!.querySelector('input[type="number"]') as HTMLInputElement
  expect(nextInput).toHaveRole('spinbutton')
  expect(nextInput).not.toBeDisabled()
  expect(nextInput).toHaveValue(15)
  expect(nextInput).toBe(input)
  expect(nextInput.closest('article')).toBe(article)
})
