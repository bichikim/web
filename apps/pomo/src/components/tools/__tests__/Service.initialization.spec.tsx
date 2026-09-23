/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {PreferenceContext, type PreferenceEntry} from 'src/hooks/use-preference'
import type {LocalDateRuntime} from 'src/features/civil-date'
import {Service} from '../Service'

const resultState = vi.hoisted(() => ({events: [] as string[], values: [] as string[]}))

vi.mock('../../p-date-picker/PDatePicker', () => ({PDatePicker: () => null}))
vi.mock('../../p-select/PSelect', () => ({PSelect: () => null}))
vi.mock('../../p-input/PInput', () => ({PInput: () => null}))
vi.mock('../../p-switch/PSwitch', () => ({PSwitch: () => null}))
vi.mock('../Result', () => ({
  Result: (props: {readonly label?: string; readonly value: string}) => {
    resultState.events.push('result')
    resultState.values.push(props.value)
    return <section aria-label={props.label}>{props.value}</section>
  },
}))

it('should render the service result before the client date lifecycle refreshes', () => {
  const dates = [new Date(2026, 0, 1), new Date(2026, 0, 2)]
  const runtime = {
    now: vi.fn(() => {
      resultState.events.push('now')
      return dates.shift() ?? new Date(2026, 0, 2)
    }),
    schedule: vi.fn<(callback: () => void, delay: number) => () => void>(() => vi.fn()),
    subscribe: vi.fn<(callback: (isHidden: boolean) => void) => () => void>(() => vi.fn()),
  } satisfies LocalDateRuntime
  const [snapshot] = createSignal({
    value: {
      branch: 'army',
      days: '',
      manual: false,
      start: '2026-01-01',
    },
  })
  const entry: PreferenceEntry = {
    setValue: vi.fn(),
    snapshot,
    subscribeErrors: vi.fn(() => () => undefined),
    subscribeSaves: vi.fn(() => () => undefined),
  }

  render(() => (
    <PreferenceContext.Provider value={{get: () => entry}}>
      <Service runtime={runtime} />
    </PreferenceContext.Provider>
  ))

  expect(resultState.events).toEqual(['now', 'result', 'now'])
  expect(resultState.values[0]).toContain('남은 날짜: 545일')
  expect(runtime.now).toHaveBeenCalledTimes(2)
})
