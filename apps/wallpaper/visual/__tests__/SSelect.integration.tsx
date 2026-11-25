import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {SSelect} from '../../src/components/SSelect'
import 'virtual:uno.css'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
const OPTIONS = [
  {label: '첫 항목', value: 'first'},
  {label: '다음 항목', value: 'next'},
]

it.each(['field', 'breadcrumb', 'breadcrumb-arrow'] as const)(
  'should close on the second pointer click with %s appearance',
  async (appearance) => {
    render(() => <SSelect label="항목 선택" options={OPTIONS} appearance={appearance} />)
    const trigger = screen.getByRole('combobox', {name: '항목 선택'})
    await userEvent.click(trigger)
    expect(screen.getByRole('listbox')).toBeVisible()
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).toBeNull()
    await userEvent.click(trigger)
    expect(screen.getByRole('listbox')).toBeVisible()
  },
)

it('should close on the second click when showPopover does not establish an invoker', async () => {
  const showPopover = HTMLElement.prototype.showPopover
  vi.spyOn(HTMLElement.prototype, 'showPopover').mockImplementation(
    function show(this: HTMLElement) {
      showPopover.call(this)
    },
  )
  render(() => <SSelect label="항목 선택" options={OPTIONS} />)
  const trigger = screen.getByRole('combobox', {name: '항목 선택'})
  await userEvent.click(trigger)
  expect(screen.getByRole('listbox')).toBeVisible()
  await userEvent.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('listbox')).toBeNull()
})
