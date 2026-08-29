import type {DesktopMode} from './model'

const BACKGROUND_LABEL = 'background'
const SURFACE_MARGIN = 24

interface DesktopWorkArea {
  readonly height: number
  readonly left: number
  readonly top: number
  readonly width: number
}

const getDesktopWorkArea = (): DesktopWorkArea => {
  const positionedScreen = window.screen as Screen & {
    readonly availLeft?: number
    readonly availTop?: number
  }

  return {
    height: positionedScreen.availHeight,
    left: positionedScreen.availLeft ?? 0,
    top: positionedScreen.availTop ?? 0,
    width: positionedScreen.availWidth,
  }
}

const fitCoordinate = (start: number, length: number, size: number, preferred: number): number =>
  Math.max(start, Math.min(preferred, start + Math.max(0, length - size)))

const getControlSurfaceOptions = () => {
  const workArea = getDesktopWorkArea()
  const player = {height: 340, width: 520}
  const pomodoro = {height: 520, width: 360}
  const settings = {height: 620, width: 420}

  return [
    {
      ...player,
      label: 'desktop-player',
      path: '/desktop/player/',
      x: fitCoordinate(workArea.left, workArea.width, player.width, workArea.left + SURFACE_MARGIN),
      y: fitCoordinate(
        workArea.top,
        workArea.height,
        player.height,
        workArea.top + workArea.height - player.height - SURFACE_MARGIN,
      ),
    },
    {
      ...pomodoro,
      label: 'desktop-pomodoro',
      path: '/desktop/pomodoro/',
      x: fitCoordinate(
        workArea.left,
        workArea.width,
        pomodoro.width,
        workArea.left + (workArea.width - pomodoro.width) / 2,
      ),
      y: fitCoordinate(
        workArea.top,
        workArea.height,
        pomodoro.height,
        workArea.top + SURFACE_MARGIN,
      ),
    },
    {
      ...settings,
      label: 'desktop-settings',
      path: '/desktop/settings/',
      x: fitCoordinate(
        workArea.left,
        workArea.width,
        settings.width,
        workArea.left + workArea.width - settings.width - SURFACE_MARGIN,
      ),
      y: fitCoordinate(
        workArea.top,
        workArea.height,
        settings.height,
        workArea.top + SURFACE_MARGIN,
      ),
    },
  ] as const
}

const CONTENT_SURFACE_LABELS = ['desktop-player', 'desktop-pomodoro'] as const
const SETTINGS_SURFACE_LABEL = 'desktop-settings'

const getSurfaceApi = () => import('@winter-love/desktop-surface')

const closeSurfaces = async (labels: ReadonlyArray<string>): Promise<void> => {
  const {closeControlSurface} = await getSurfaceApi()
  const results = await Promise.allSettled(labels.map((label) => closeControlSurface({label})))
  const errors = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []))

  if (errors.length === 1) {
    throw errors[0]
  }
  if (errors.length > 1) {
    throw new AggregateError(errors, 'One or more desktop control surfaces could not be closed')
  }
}

const restoreNormalMode = async (): Promise<void> => {
  const {restoreSurface} = await getSurfaceApi()
  await restoreSurface({label: BACKGROUND_LABEL})
}

const enterDesktopMode = async (): Promise<void> => {
  const {openControlSurface, restoreSurface, setBackgroundSurface} = await getSurfaceApi()

  try {
    await setBackgroundSurface({interaction: 'passThrough', label: BACKGROUND_LABEL})
    await Promise.all(getControlSurfaceOptions().map((options) => openControlSurface(options)))
  } catch (error: unknown) {
    const cleanupResults = await Promise.allSettled([
      closeSurfaces([...CONTENT_SURFACE_LABELS, SETTINGS_SURFACE_LABEL]),
      restoreSurface({label: BACKGROUND_LABEL}),
    ])
    const cleanupErrors = cleanupResults.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    )

    if (cleanupErrors.length > 0) {
      throw new AggregateError([error, ...cleanupErrors], 'Desktop mode entry and rollback failed')
    }

    throw error
  }
}

export const applyDesktopMode = async (mode: DesktopMode): Promise<void> => {
  switch (mode) {
    case 'desktop':
      await enterDesktopMode()
      return
    case 'interactiveDesktop':
      const {setBackgroundSurface} = await getSurfaceApi()
      await setBackgroundSurface({interaction: 'interactive', label: BACKGROUND_LABEL})
      return
    case 'normal':
      await restoreNormalMode()
      return
    case 'widget':
      const {setWidgetSurface} = await getSurfaceApi()
      await setWidgetSurface({height: 520, label: BACKGROUND_LABEL, width: 420})
      return
  }

  const exhaustiveMode: never = mode
  return exhaustiveMode
}

/** Persists content-owned state by closing player and timer surfaces before mode publication. */
export const prepareDesktopModeTransition = async (mode: DesktopMode): Promise<void> => {
  if (mode !== 'desktop') {
    await closeSurfaces(CONTENT_SURFACE_LABELS)
  }
}

/** Releases the mode controller after all windows have observed the new mode. */
export const finishDesktopModeTransition = async (mode: DesktopMode): Promise<void> => {
  if (mode !== 'desktop') {
    await closeSurfaces([SETTINGS_SURFACE_LABEL])
  }
}
