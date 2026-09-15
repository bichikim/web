/** @vitest-environment jsdom */

import {Select} from '@kobalte/core/select'
import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {PSelectItem} from '../Item'

const options = [{icon: 'i-tabler-moon', label: '밤', value: 'night'}] as const

it('should resolve icon item classes through actual Kobalte item primitives', () => {
  const getIconClass = vi.fn((icon: string) => `resolved-${icon}`)

  render(() => (
    <>
      <Select
        itemComponent={(itemProps) => (
          <PSelectItem appearance="icon" getIconClass={getIconClass} {...itemProps} />
        )}
        optionTextValue="label"
        optionValue="value"
        options={[...options]}
        value={options[0]}
      >
        <Select.Listbox />
      </Select>
      <Select
        itemComponent={(itemProps) => <PSelectItem appearance="icon" {...itemProps} />}
        optionTextValue="label"
        optionValue="value"
        options={[...options]}
        value={options[0]}
      >
        <Select.Listbox />
      </Select>
    </>
  ))

  expect(screen.getAllByText('밤')).toHaveLength(2)
  expect(getIconClass).toHaveBeenCalledWith('i-tabler-check')
  expect(getIconClass).toHaveBeenCalledWith('i-tabler-moon')
  const items = screen.getAllByRole('option', {name: '밤'})
  const [customItemIcon, customIndicator, fallbackItemIcon, fallbackIndicator] = items.flatMap(
    (item) => [...item.querySelectorAll('span[aria-hidden="true"]')],
  )
  expect(customItemIcon).toHaveClass('resolved-i-tabler-moon')
  expect(customIndicator).toHaveClass('resolved-i-tabler-check', 'size-4')
  expect(fallbackItemIcon).toHaveClass('i-tabler-moon')
  expect(fallbackIndicator).toHaveClass('i-tabler-check', 'size-4')
})
