/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {DISPLAY_THEME_BOOTSTRAP_SCRIPT, initializeDisplayThemeDocument} from '../bootstrap'
import {DISPLAY_THEME_STORAGE_KEY} from '../model'

describe('initializeDisplayThemeDocument', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.colorScheme = 'dark'
    document.head.innerHTML = '<meta name="theme-color" content="#17130f">'
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({matches: false})),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should apply an explicit saved preference before hydration', () => {
    localStorage.setItem(DISPLAY_THEME_STORAGE_KEY, '"bright"')

    initializeDisplayThemeDocument()

    expect(document.documentElement.dataset.colorScheme).toBe('light')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#f7f8fa',
    )
  })

  it('should follow the operating system when the saved preference is unavailable or invalid', () => {
    localStorage.setItem(DISPLAY_THEME_STORAGE_KEY, '"unknown"')
    vi.mocked(matchMedia).mockReturnValue({matches: true} as MediaQueryList)

    initializeDisplayThemeDocument()

    expect(document.documentElement.dataset.colorScheme).toBe('dark')
  })

  it('should serialize a standalone bootstrap script with the storage contract embedded', () => {
    expect(DISPLAY_THEME_BOOTSTRAP_SCRIPT).toContain(DISPLAY_THEME_STORAGE_KEY)
    expect(DISPLAY_THEME_BOOTSTRAP_SCRIPT).toContain('prefers-color-scheme: dark')
  })
})
