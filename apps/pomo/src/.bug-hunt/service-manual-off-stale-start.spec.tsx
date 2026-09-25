/** @vitest-environment jsdom */

import {createSignal} from 'solid-js'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import type {LocalDateRuntime} from 'src/features/civil-date'
import {PreferenceContext, type PreferenceEntry} from 'src/hooks/use-preference'
import {Service} from '../components/tools/Service'

it('should recover service calculation after disabling manual enlistment days', async () => {
  const runtime: LocalDateRuntime = {
    now: () => new Date('2026-06-01T12:00:00Z'),
    schedule: () => () => undefined,
    subscribe: () => () => undefined,
  }
  const [snapshot, setSnapshot] = createSignal({
    value: {
      branch: 'army' as const,
      days: '300',
      manual: true,
      start: '2020-01-01',
    },
  })
  const entry: PreferenceEntry = {
    setValue: (value) => {
      if (value !== null) {
        setSnapshot({value})
      }
    },
    snapshot,
    subscribeErrors: () => () => undefined,
    subscribeSaves: () => () => undefined,
  }

  render(() => (
    <PreferenceContext.Provider value={{get: () => entry}}>
      <Service runtime={runtime} />
    </PreferenceContext.Provider>
  ))

  await waitFor(() =>
    expect(screen.getByRole('region', {name: '예상 전역일'})).toBeInTheDocument(),
  )

  fireEvent.click(screen.getByRole('switch', {name: '복무기간 직접 입력'}))

  expect(screen.getByRole('region', {name: '예상 전역일'})).toBeInTheDocument()
})
