import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as m from '@paraglide/message'
import {AdminFeatureRequestCard} from '../AdminFeatureRequestCard'

afterEach(cleanup)

it('should remove a vote-goal error when the selected status has no vote goal', async () => {
  const onSave = vi.fn(async () => null)
  render(() =>
    createComponent(AdminFeatureRequestCard, {
      disabled: false,
      onSave,
      request: {
        createdAt: '2026-09-17T01:00:00.000Z',
        description: '',
        id: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
        status: 'requested',
        targetVoteCount: null,
        title: '집중 세션 통계',
        voteCount: 0,
        votedByCurrentUser: false,
      },
    }),
  )

  await page.getByRole('button', {name: m.feature_request_status_voting()}).click()
  await page.getByRole('spinbutton').fill('')
  await page.getByRole('button', {name: m.admin_feature_request_approve()}).click()
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent(m.admin_feature_request_target_invalid())

  await page.getByRole('button', {name: m.feature_request_status_requested()}).click()

  await expect.element(page.getByRole('spinbutton')).not.toBeInTheDocument()
  await expect.element(page.getByRole('alert')).not.toBeInTheDocument()
  expect(onSave).not.toHaveBeenCalled()
})
