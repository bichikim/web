/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PreferenceContext, type PreferenceEntry} from 'src/hooks/use-preference'
import type {LocalDateRuntime} from 'src/features/civil-date'
import {Service} from '../Service'

vi.mock('../../p-date-picker/PDatePicker', () => ({PDatePicker: () => null}))
vi.mock('../../p-select/PSelect', () => ({PSelect: () => null}))
vi.mock('../../p-input/PInput', () => ({PInput: () => null}))
vi.mock('../../p-switch/PSwitch', () => ({PSwitch: () => null}))
vi.mock('../Result', () => ({
  Result: (props: {readonly label?: string; readonly value: string}) => (
    <section aria-label={props.label}>{props.value}</section>
  ),
}))

afterEach(() => vi.unstubAllEnvs())

it('should calculate service days using the UTC calendar date at a local date boundary', () => {
  vi.stubEnv('TZ', 'America/Los_Angeles')
  const now = new Date('2026-06-15T06:00:00.000Z')
  const runtime = {
    now: vi.fn(() => now),
    schedule: vi.fn<(callback: () => void, delay: number) => () => void>(() => vi.fn()),
    subscribe: vi.fn<(callback: (isHidden: boolean) => void) => () => void>(() => vi.fn()),
  } satisfies LocalDateRuntime
  const [snapshot] = createSignal({
    value: {
      branch: 'army',
      days: '',
      manual: false,
      start: '2026-06-15',
    },
  })
  const entry: PreferenceEntry = {
    setValue: vi.fn(),
    snapshot,
    subscribeErrors: vi.fn(() => () => undefined),
    subscribeSaves: vi.fn(() => () => undefined),
  }

  expect(now.getDate()).toBe(14)
  render(() => (
    <PreferenceContext.Provider value={{get: () => entry}}>
      <Service runtime={runtime} />
    </PreferenceContext.Provider>
  ))

  expect(screen.getByRole('region', {name: '예상 전역일'}).textContent).toContain(
    '남은 날짜: 547일',
  )
  expect(screen.getByText(/현재 UTC 날짜 2026-06-15 기준/u)).toBeTruthy()
})
