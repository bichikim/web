/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {HSelectContent} from '../HSelectContent'

describe('HSelectContent', () => {
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
    expect(content).toHaveStyle({
      '--select-menu-left': '10px',
      '--select-menu-top': '20px',
      '--select-menu-width': '200px',
    })
  })
})
