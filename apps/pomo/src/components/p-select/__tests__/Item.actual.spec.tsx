/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {Select} from '@kobalte/core/select'
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
  expect(document.querySelector('.resolved-i-tabler-check')).not.toBeNull()
  expect(document.querySelector('.resolved-i-tabler-moon')).not.toBeNull()
  expect(document.querySelector('.i-tabler-check.size-4')).not.toBeNull()
  expect(document.querySelector('.i-tabler-moon')).not.toBeNull()
})
