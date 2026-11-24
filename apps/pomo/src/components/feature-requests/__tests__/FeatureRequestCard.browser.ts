import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {page} from 'vitest/browser'
import {FeatureRequestCard} from '../FeatureRequestCard'

const originalGetLocale = getLocale

afterEach(() => {
  cleanup()
  overwriteGetLocale(originalGetLocale)
})

it.each(['en', 'ko'] as const)(
  'should display the creation date in the %s app locale',
  async (locale) => {
    const createdAt = '2026-09-17T16:00:00.000Z'
    overwriteGetLocale(() => locale)
    render(() =>
      createComponent(FeatureRequestCard, {
        isAuthenticated: false,
        isVoting: false,
        onVote: () => undefined,
        request: {
          createdAt,
          description: '',
          id: 'feature-request',
          status: 'requested',
          targetVoteCount: null,
          title: 'Focus session statistics',
          voteCount: 0,
          votedByCurrentUser: false,
        },
      }),
    )

    const expected = new Intl.DateTimeFormat(locale, {dateStyle: 'medium'}).format(
      new Date(createdAt),
    )
    await expect.element(page.getByRole('time')).toHaveTextContent(expected)
  },
)
