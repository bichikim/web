/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {TransferConnectionHelp} from '../TransferConnectionHelp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('TransferConnectionHelp', () => {
  it('should display Mac settings guidance on a Mac', () => {
    vi.stubGlobal('navigator', {
      maxTouchPoints: 0,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    })
    render(() => <TransferConnectionHelp />)
    expect(screen.getByText(m.transfer_connection_help_mac())).toBeInTheDocument()
  })

  it.each([
    ['Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0],
    ['Android', 'Mozilla/5.0 (Linux; Android 16)', 5],
    ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5],
    ['iPad desktop mode', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5],
  ])('should display only common guidance on %s', (_, userAgent, maxTouchPoints) => {
    vi.stubGlobal('navigator', {maxTouchPoints, userAgent})
    render(() => <TransferConnectionHelp />)
    expect(screen.queryByText(m.transfer_connection_help_mac())).not.toBeInTheDocument()
    expect(screen.getByText(m.transfer_connection_help_retry())).toBeInTheDocument()
    expect(screen.getByText(m.transfer_connection_help()).closest('details')).not.toHaveAttribute(
      'open',
    )
  })
})
