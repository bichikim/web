export type DesktopMode = 'desktop' | 'interactiveDesktop' | 'normal' | 'widget'

export const isDesktopMode = (value: unknown): value is DesktopMode =>
  value === 'normal' || value === 'widget' || value === 'desktop' || value === 'interactiveDesktop'
