/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {HSelectContent} from '../HSelectContent'
import {HSelectItem} from '../HSelectItem'
import {HSelectRoot} from '../HSelectRoot'
import {HSelectSeparator} from '../HSelectSeparator'
import {HSelectTrigger} from '../HSelectTrigger'
import {SSelectButton} from '../SSelectButton'
import {SSelectItem} from '../SSelectItem'
import {SSelectList} from '../SSelectList'
import {SSelectTrigger} from '../SSelectTrigger'

describe('Kobalte select-menu primitives', () => {
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

  it('should compose styled trigger, list, and item primitives', async () => {
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

describe('legacy select-menu primitives', () => {
  it('should delegate key and toggle events to the legacy controller', async () => {
    const handleContentKeyDown = vi.fn()
    const onPanelToggle = vi.fn()
    const registerPanel = vi.fn()
    const controller = {
      handleContentKeyDown,
      left: () => 10,
      onPanelToggle,
      registerPanel,
      top: () => 20,
    } as unknown as NonNullable<Parameters<typeof HSelectContent>[0]['controller']>
    render(() => (
      <HSelectContent controller={controller} widthPx={200} data-testid="legacy">
        legacy content
      </HSelectContent>
    ))
    const content = screen.getByTestId('legacy')

    await fireEvent.keyDown(content, {key: 'ArrowDown'})
    content.dispatchEvent(new Event('toggle'))

    expect(registerPanel).toHaveBeenCalled()
    expect(handleContentKeyDown).toHaveBeenCalled()
    expect(onPanelToggle).toHaveBeenCalled()
    expect(content).toHaveStyle({left: '10px', top: '20px', width: '200px'})
  })

  it('should render a standalone styled select button', () => {
    render(() => <SSelectButton class="custom-button">Standalone</SSelectButton>)

    expect(screen.getByRole('button', {name: 'Standalone'})).toHaveClass('custom-button')
  })
})
