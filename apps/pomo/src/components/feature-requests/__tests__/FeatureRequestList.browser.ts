import {MemoryRouter, query} from '@solidjs/router'
import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as m from '@paraglide/message'
import {useAuth} from '../../../features/auth/AuthProvider'
import type {AuthController} from '../../../features/auth/controller'
import {listFeatureRequests, voteFeatureRequest} from '../../../features/feature-requests/api'
import {type FeatureRequest, useFeatureRequests} from '../../../features/feature-requests'
import {FeatureRequestList} from '../FeatureRequestList'

vi.mock('../../../features/auth/AuthProvider', () => ({useAuth: vi.fn()}))
vi.mock('../../../features/feature-requests/api', async (original) => ({
  ...(await original<typeof import('../../../features/feature-requests/api')>()),
  createFeatureRequest: vi.fn(),
  listAdminFeatureRequests: vi.fn(),
  listFeatureRequests: vi.fn(),
  voteFeatureRequest: vi.fn(),
}))

afterEach(() => {
  cleanup()
  query.clear()
  vi.resetAllMocks()
})

it('should keep concurrent vote buttons disabled until each vote is resolved', async () => {
  const authentication: AuthController = {
    session: () => ({kind: 'authenticated', provider: 'toss'}),
    state: () => ({kind: 'authenticated', provider: 'toss'}),
  }
  const requests = ['First', 'Second'].map(
    (title): FeatureRequest => ({
      createdAt: '2026-08-11T00:00:00.000Z',
      description: '',
      id: title,
      status: 'voting',
      targetVoteCount: 5,
      title,
      voteCount: 0,
      votedByCurrentUser: false,
    }),
  )
  const first = Promise.withResolvers<{status: 'voted'}>()
  const second = Promise.withResolvers<{status: 'voted'}>()
  vi.mocked(useAuth).mockReturnValue(authentication)
  vi.mocked(listFeatureRequests).mockResolvedValue({hasMore: false, requests})
  vi.mocked(voteFeatureRequest)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  render(() =>
    createComponent(MemoryRouter, {
      root: () =>
        createComponent(FeatureRequestList, {
          authentication,
          model: useFeatureRequests(),
          newRequestAction: undefined,
        }),
    }),
  )
  const firstCard = page.getByRole('article', {name: 'First'})
  const secondCard = page.getByRole('article', {name: 'Second'})
  const firstVote = firstCard.getByRole('button', {name: m.feature_request_vote()})
  const secondVote = secondCard.getByRole('button', {name: m.feature_request_vote()})
  try {
    await firstVote.click()
    await secondVote.click()
    await expect.element(firstVote).toBeDisabled()
    await expect.element(secondVote).toBeDisabled()
    first.resolve({status: 'voted'})
    await expect
      .element(firstCard.getByRole('button', {name: m.feature_request_voted()}))
      .toBeDisabled()
    await expect.element(secondVote).toBeDisabled()
    expect(voteFeatureRequest).toHaveBeenCalledTimes(2)
  } finally {
    first.resolve({status: 'voted'})
    second.resolve({status: 'voted'})
  }
  await expect
    .element(secondCard.getByRole('button', {name: m.feature_request_voted()}))
    .toBeDisabled()
})
