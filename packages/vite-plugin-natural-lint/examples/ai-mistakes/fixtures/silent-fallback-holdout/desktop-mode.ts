type DesktopMode = 'desktop' | 'normal' | 'widget'

interface ModeStorage {
  readonly getItem: (key: string) => string | null
}

/** Reads the preferred mode and falls back to normal when storage is unavailable. */
export const readDesktopMode = (storage: ModeStorage): DesktopMode => {
  try {
    const value = storage.getItem('desktop-mode')
    return value === 'desktop' || value === 'widget' ? value : 'normal'
  } catch {
    return 'normal'
  }
}
