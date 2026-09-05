export interface PictureDiaryEnvironment {
  readonly now: () => Date
  readonly createId: () => string
  readonly observeCompact: (onChange: (compact: boolean) => void) => () => void
}

export const createBrowserDiaryEnvironment = (): PictureDiaryEnvironment => ({
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
  observeCompact: (onChange) => {
    const media = window.matchMedia?.('(width < 48rem)')
    const update = () => onChange(media?.matches ?? false)
    update()
    media?.addEventListener?.('change', update)
    return () => media?.removeEventListener?.('change', update)
  },
})
