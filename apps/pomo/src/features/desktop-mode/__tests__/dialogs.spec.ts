import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {closeControlSurface, openControlSurface} from '@winter-love/desktop-surface'

import {closeDesktopDialog, openDesktopDialog} from '../dialogs'

vi.mock('@winter-love/desktop-surface', () => ({
  closeControlSurface: vi.fn(),
  openControlSurface: vi.fn(),
}))

const dialogOptions = {
  memoryAssist: {
    cornerRadius: 20,
    height: 760,
    label: 'desktop-dialog-memory-assist',
    path: '/desktop/dialog/memory-assist/',
    width: 840,
  },
  pomodoro: {
    cornerRadius: 20,
    height: 560,
    label: 'desktop-dialog-pomodoro',
    path: '/desktop/dialog/pomodoro/',
    width: 380,
  },
  settings: {
    cornerRadius: 20,
    height: 760,
    label: 'desktop-dialog-settings',
    path: '/desktop/dialog/settings/',
    width: 840,
  },
  tools: {
    cornerRadius: 20,
    height: 620,
    label: 'desktop-dialog-tools',
    path: '/desktop/dialog/tools/',
    width: 760,
  },
  versionNotice: {
    cornerRadius: 20,
    height: 620,
    label: 'desktop-dialog-version-notice',
    path: '/desktop/dialog/version-notice/',
    width: 760,
  },
} as const

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(openControlSurface).mockResolvedValue({created: true})
  vi.mocked(closeControlSurface).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

it.each(Object.entries(dialogOptions))(
  'should open the %s desktop dialog',
  async (dialog, options) => {
    await openDesktopDialog(dialog as keyof typeof dialogOptions)

    expect(openControlSurface).toHaveBeenCalledExactlyOnceWith(options)
  },
)

it.each(Object.entries(dialogOptions))(
  'should close the %s desktop dialog',
  async (dialog, options) => {
    await closeDesktopDialog(dialog as keyof typeof dialogOptions)

    expect(closeControlSurface).toHaveBeenCalledExactlyOnceWith({label: options.label})
  },
)
