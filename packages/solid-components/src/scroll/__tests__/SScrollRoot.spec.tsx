/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createRoot} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {SScrollBar} from '../SScrollBar'
import {SScrollBody} from '../SScrollBody'
import {SScrollHandle} from '../SScrollHandle'
import {SScrollRoot} from '../SScrollRoot'
import {useScrollBar} from '../scroll-bar-context'
import {useScrollContext} from '../scroll-context'

describe('scroll components', () => {
  it('should expose scroll geometry through the bar and handle', async () => {
    const view = render(() => (
      <SScrollRoot component="section">
        <SScrollBody component="div" data-testid="body">
          Content
        </SScrollBody>
        <SScrollBar component="div" data-testid="bar">
          <SScrollHandle component="button">Handle</SScrollHandle>
        </SScrollBar>
      </SScrollRoot>
    ))
    const body = view.getByTestId('body')
    Object.defineProperties(body, {
      clientHeight: {configurable: true, value: 100},
      clientWidth: {configurable: true, value: 80},
      scrollHeight: {configurable: true, value: 400},
      scrollTop: {configurable: true, value: 150, writable: true},
      scrollWidth: {configurable: true, value: 80},
    })
    body.getBoundingClientRect = () => ({
      bottom: 110,
      height: 100,
      left: 5,
      right: 85,
      toJSON: () => ({}),
      top: 10,
      width: 80,
      x: 5,
      y: 10,
    })

    await fireEvent.scroll(body)

    expect(view.getByTestId('bar').getAttribute('data-show')).toBe('true')
    expect(view.getByRole('scrollbar').getAttribute('aria-valuenow')).toBe('150')
    expect(view.getByRole('scrollbar').getAttribute('style')).toContain('--var-size: 25px')
  })

  it('should reject context hooks outside their providers', () => {
    expect(() => createRoot(() => useScrollContext())).toThrow(
      'useScrollContext must be used within a ScrollContext.Provider',
    )
    expect(() => createRoot(() => useScrollBar())).toThrow(
      'useScrollBarContext must be used within a ScrollBar',
    )
  })
})
