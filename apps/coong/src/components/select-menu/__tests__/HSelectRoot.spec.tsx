/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import userEvent from '@testing-library/user-event'
import {HSelectRoot} from '../HSelectRoot'
import {HSelectTrigger} from '../HSelectTrigger'
import {HSelectContent} from '../HSelectContent'
import {HSelectItem} from '../HSelectItem'
import {HSelectSeparator} from '../HSelectSeparator'

describe('HSelectRoot', () => {
  it('should open a menu and invoke the selected item', async () => {
    const onSelect = vi.fn()
    render(() => (
      <HSelectRoot anchorGapPx={4}>
        <HSelectTrigger>Open menu</HSelectTrigger>
        <HSelectContent>
          <HSelectItem onSelect={onSelect}>First item</HSelectItem>
          <HSelectSeparator data-testid="separator" />
        </HSelectContent>
      </HSelectRoot>
    ))

    const trigger = screen.getByRole('button', {name: 'Open menu'})
    expect(trigger).toHaveAttribute('type', 'button')
    await userEvent.click(trigger)
    const item = await screen.findByText('First item')
    await userEvent.click(item)

    expect(onSelect).toHaveBeenCalledOnce()
  })
})
