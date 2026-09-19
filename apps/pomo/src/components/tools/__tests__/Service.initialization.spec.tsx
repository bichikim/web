/** @vitest-environment jsdom */
import {PreferenceProvider} from 'src/hooks/use-preference'
import {render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {useLocalDate} from 'src/features/civil-date'
import {servicePreference} from 'src/features/tools'
import {Service} from '../Service'

vi.mock('src/features/civil-date/use-local-date', () => ({useLocalDate: vi.fn()}))

afterEach(() => {
  vi.restoreAllMocks()
})

it('should calculate a saved service period from the initial local date', async () => {
  vi.mocked(useLocalDate).mockImplementation(
    (props = {}) =>
      () =>
        props.initialDate === undefined ? '' : '2026-01-01',
  )
  vi.spyOn(servicePreference.storage, 'read').mockResolvedValue({
    branch: 'army',
    days: '',
    manual: false,
    start: '2026-01-01',
  })

  render(() => (
    <PreferenceProvider>
      <Service />
    </PreferenceProvider>
  ))

  await waitFor(() => expect(screen.getByRole('region', {name: '예상 전역일'})).toBeVisible())
  expect(screen.getByText(/2027-06-30/u)).toBeVisible()
})
