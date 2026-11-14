/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'

import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createEvents} from './fixtures/create-events'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'

const eventMocks = vi.hoisted(() => ({usePEvents: vi.fn()}))

vi.mock('../../../features/focus-room-dialogue', async () => {
  const actual = await vi.importActual<typeof import('../../../features/focus-room-dialogue')>(
    '../../../features/focus-room-dialogue',
  )

  return {...actual, usePEvents: eventMocks.usePEvents}
})

import {DelayedEndEventSettings} from '../DelayedEndEventSettings'

const originalGetLocale = getLocale

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should not show a success message after saving the waiting time', async () => {
  const events = createEvents()
  eventMocks.usePEvents.mockReturnValue(events)

  render(() => <DelayedEndEventSettings />)
  fireEvent.input(screen.getByRole('spinbutton', {name: '대기 시간(분)'}), {
    target: {value: '45'},
  })

  await vi.waitFor(() => expect(events.setDelayedEndEventDuration).toHaveBeenCalledWith(45))
  expect(screen.queryByRole('status')).toBeNull()
})

it('should restore the persisted waiting time when saving fails', async () => {
  const saveError = new Error('storage unavailable')
  const events = createEvents({
    setDelayedEndEventDuration: vi.fn(async () => {
      throw saveError
    }),
  })
  eventMocks.usePEvents.mockReturnValue(events)

  render(() => <DelayedEndEventSettings />)
  const input = screen.getByRole('spinbutton', {name: '대기 시간(분)'})
  fireEvent.input(input, {target: {value: '45'}})

  await vi.waitFor(() => expect(events.setDelayedEndEventDuration).toHaveBeenCalledWith(45))
  await vi.waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('저장하지 못했어요'))

  expect(input).toHaveValue('30')
})
