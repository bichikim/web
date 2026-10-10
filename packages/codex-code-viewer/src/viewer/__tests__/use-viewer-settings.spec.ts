/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useViewerSettings} from '../use-viewer-settings'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})
describe('useViewerSettings', () => {
  it('should default to two lines and restore a changed preference on the next mount', () => {
    createRoot((dispose) => {
      const settings = useViewerSettings()
      expect(settings.previewLines()).toBe(2)
      settings.changePreviewLines(4)
      expect(settings.previewLines()).toBe(4)
      expect(useViewerSettings().previewLines()).toBe(4)
      settings.changePreviewLines(0)
      expect(settings.previewLines()).toBe(4)
      dispose()
    })
  })
  it('should keep the chosen value when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked')
    })
    createRoot((dispose) => {
      const settings = useViewerSettings()
      expect(settings.previewLines()).toBe(2)
      settings.changePreviewLines(3)
      expect(settings.previewLines()).toBe(3)
      dispose()
    })
  })
  it('should ignore an invalid persisted preference', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('100')
    createRoot((dispose) => {
      expect(useViewerSettings().previewLines()).toBe(2)
      dispose()
    })
  })
})
