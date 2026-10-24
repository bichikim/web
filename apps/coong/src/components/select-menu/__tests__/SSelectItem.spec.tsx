/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import userEvent from '@testing-library/user-event'
import {HSelectRoot} from '../HSelectRoot'
import {SSelectTrigger} from '../SSelectTrigger'
import {SSelectList} from '../SSelectList'
import {SSelectItem} from '../SSelectItem'

describe('SSelectItem', () => {
  it('should preserve the item class inside a styled menu', async () => {
    render(() => (
      <HSelectRoot>
        <SSelectTrigger class="custom-trigger">Styled menu</SSelectTrigger>
        <SSelectList class="custom-list" widthPx={240}>
          <SSelectItem class="custom-item">Styled item</SSelectItem>
        </SSelectList>
      </HSelectRoot>
    ))

    await userEvent.click(screen.getByRole('button', {name: 'Styled menu'}))

    expect(await screen.findByText('Styled item')).toHaveClass('custom-item')
  })
})
