const DESKTOP_DIALOG_OPTIONS = {
  featureRequests: {
    cornerRadius: 20,
    height: 760,
    label: 'desktop-dialog-feature-requests',
    path: '/desktop/dialog/feature-requests/',
    width: 760,
  },
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

export type DesktopDialog = keyof typeof DESKTOP_DIALOG_OPTIONS

const getSurfaceApi = () => import('@winter-love/desktop-surface')

/** Opens one desktop-only dialog in its own native WebView window. */
export const openDesktopDialog = async (dialog: DesktopDialog): Promise<void> => {
  const {openControlSurface} = await getSurfaceApi()
  await openControlSurface(DESKTOP_DIALOG_OPTIONS[dialog])
}

/** Closes one desktop-only dialog window when its native close control is used. */
export const closeDesktopDialog = async (dialog: DesktopDialog): Promise<void> => {
  const {closeControlSurface} = await getSurfaceApi()
  await closeControlSurface({label: DESKTOP_DIALOG_OPTIONS[dialog].label})
}
