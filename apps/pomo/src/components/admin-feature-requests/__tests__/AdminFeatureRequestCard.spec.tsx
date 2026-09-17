/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import type {FeatureRequest} from '../../../features/feature-requests'
import {AdminFeatureRequestCard} from '../AdminFeatureRequestCard'

const REQUEST: FeatureRequest = {
  createdAt: '2026-09-17T01:00:00.000Z',
  description: '집중 기록을 확인하고 싶어요.',
  id: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  status: 'requested',
  targetVoteCount: null,
  title: '집중 세션 통계',
  voteCount: 4,
  votedByCurrentUser: false,
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('should validate a required vote goal before saving a voting status', async () => {
  const onSave = vi.fn(async (): Promise<string | null> => null)
  render(() => <AdminFeatureRequestCard disabled={false} onSave={onSave} request={REQUEST} />)

  fireEvent.click(screen.getByRole('button', {name: m.feature_request_status_voting()}))
  const target = screen.getByRole('spinbutton', {
    name: m.admin_feature_request_vote_goal(),
  }) as HTMLInputElement
  fireEvent.input(target, {target: {value: ''}})
  fireEvent.submit(target.form!)

  expect(await screen.findByRole('alert')).toHaveTextContent(
    m.admin_feature_request_target_invalid(),
  )
  expect(onSave).not.toHaveBeenCalled()
})

it('should save a selected status and display a save error', async () => {
  const onSave = vi.fn(async (): Promise<string | null> => null)
  render(() => <AdminFeatureRequestCard disabled={false} onSave={onSave} request={REQUEST} />)

  fireEvent.click(screen.getByRole('button', {name: m.feature_request_status_confirmed()}))
  const target = screen.getByRole('spinbutton', {
    name: m.admin_feature_request_vote_goal(),
  }) as HTMLInputElement
  fireEvent.input(target, {target: {value: '12'}})
  fireEvent.click(screen.getByRole('button', {name: m.admin_feature_request_save()}))

  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      requestId: REQUEST.id,
      status: 'confirmed',
      targetVoteCount: 12,
    }),
  )

  onSave.mockResolvedValueOnce('저장하지 못했습니다.')
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_status_completed()}))
  fireEvent.click(screen.getByRole('button', {name: m.admin_feature_request_save()}))
  expect(await screen.findByRole('alert')).toHaveTextContent('저장하지 못했습니다.')
})
