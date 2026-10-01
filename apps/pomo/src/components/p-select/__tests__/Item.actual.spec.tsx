/** @vitest-environment jsdom */

import {Select} from '@kobalte/core/select'
import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {PSelectItem} from '../Item'

const options = [{icon: 'i-tabler-moon', label: '밤', value: 'night'}] as const

it.each(['custom', 'fallback'] as const)(
  'should resolve %s icon item classes through actual Kobalte item primitives',
  (resolution) => {
    const getIconClass = vi.fn((icon: string) => `resolved-${icon}`)

    render(() => (
      <Select
        itemComponent={(itemProps) => (
          <PSelectItem
            appearance="icon"
            getIconClass={resolution === 'custom' ? getIconClass : undefined}
            {...itemProps}
          />
        )}
        optionTextValue="label"
        optionValue="value"
        options={[...options]}
        value={options[0]}
      >
        <Select.Listbox />
      </Select>
    ))

    expect(screen.getByText('밤')).toBeVisible()
    const item = screen.getByRole('option', {name: '밤'})
    const [itemIcon, indicator] = item.querySelectorAll('span[aria-hidden="true"]')
    if (resolution === 'custom') {
      expect(getIconClass).toHaveBeenCalledWith('i-tabler-check')
      expect(getIconClass).toHaveBeenCalledWith('i-tabler-moon')
      expect(itemIcon).toHaveClass('resolved-i-tabler-moon')
      expect(indicator).toHaveClass('resolved-i-tabler-check', 'size-4')
    } else {
      expect(itemIcon).toHaveClass('i-tabler-moon')
      expect(indicator).toHaveClass('i-tabler-check', 'size-4')
    }
  },
)
