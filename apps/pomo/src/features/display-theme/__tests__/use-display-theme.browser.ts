import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {DISPLAY_THEME_STORAGE_KEY} from '../model'
import {writeDisplayThemePreference} from '../storage'
import {useDisplayThemeController} from '../use-display-theme'

afterEach(cleanup)

it('should apply another document’s theme choice to the open document', async () => {
  const root = document.documentElement
  const initialClass = root.classList.contains('dark')
  await writeDisplayThemePreference('bright')
  const previous = JSON.parse(localStorage.getItem(DISPLAY_THEME_STORAGE_KEY)!)
  const {result} = renderHook(useDisplayThemeController, {wrapper: PreferenceProvider})
  const frame = document.createElement('iframe')
  document.body.append(frame)
  try {
    await expect.poll(result.preference).toBe('bright')
    expect(root.classList.contains('dark')).toBe(false)
    frame.contentWindow!.localStorage.setItem(
      DISPLAY_THEME_STORAGE_KEY,
      JSON.stringify({
        preference: 'dark',
        savedAt: previous.savedAt + 1,
      }),
    )
    await expect.poll(result.preference).toBe('dark')
    expect(root.classList.contains('dark')).toBe(true)
  } finally {
    cleanup()
    frame.remove()
    root.classList.toggle('dark', initialClass)
    localStorage.removeItem(DISPLAY_THEME_STORAGE_KEY)
  }
})
