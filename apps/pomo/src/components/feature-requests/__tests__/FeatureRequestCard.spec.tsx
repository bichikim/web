/** @vitest-environment jsdom */

import * as m from '@paraglide/message'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {FeatureRequestCard} from '../FeatureRequestCard'
import type {FeatureRequest} from '../../../features/feature-requests'

const REQUEST: FeatureRequest = {
  createdAt: '2026-09-17T01:00:00.000Z',
  description: '집중 세션 통계를 보고 싶어요.',
  id: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  status: 'voting',
  targetVoteCount: 3,
  title: '집중 세션 통계',
  voteCount: 3,
  votedByCurrentUser: false,
}

it('should show voting progress and send a +1 for an authenticated visitor', () => {
  const onVote = vi.fn()
  render(() => (
    <FeatureRequestCard isAuthenticated isVoting={false} onVote={onVote} request={REQUEST} />
  ))

  expect(screen.getByText(m.feature_request_status_voting())).toBeVisible()
  expect(screen.getByText(m.feature_request_goal_reached())).toBeVisible()
  expect(screen.getByText(m.feature_request_goal_progress({count: 3, target: 3}))).toBeVisible()

  const voteButton = screen.getByRole('button', {name: /\+1 하기/})
  expect(voteButton).not.toBeDisabled()
  fireEvent.click(voteButton)

  expect(onVote).toHaveBeenCalledWith(REQUEST.id)
})
