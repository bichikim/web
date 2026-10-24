/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PTooltipProvider} from '../Provider'
import {useTooltip} from '../context'
import {installTooltipBrowser} from './support/browser'

let browser: ReturnType<typeof installTooltipBrowser>

beforeEach(() => {
  vi.useFakeTimers()
  browser = installTooltipBrowser()
})

afterEach(() => {
  cleanup()
  browser.restore()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('should cancel pending closing on disposal without relying on a tooltip child', () => {
  const {result: tooltip, cleanup: dispose} = renderHook(useTooltip, {
    wrapper: PTooltipProvider,
  })
  const target = document.createElement('button')
  document.body.append(target)
  try {
    const request = {owner: 'trigger', target, text: () => '설명'}
    tooltip!.present(request)
    tooltip!.scheduleClose()
    expect(tooltip!.active()).toBe(request)
    expect(vi.getTimerCount()).toBe(1)
    dispose()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(150)
    expect(tooltip!.active()).toBe(request)
  } finally {
    target.remove()
  }
})
