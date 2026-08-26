import type {DesktopBackgroundInteraction, DesktopMode} from './model'

const BACKGROUND_LABEL = 'background'
const CONTROL_LABEL = 'controls'
const CONTROL_SURFACE_OPTIONS = {
  height: 360,
  label: CONTROL_LABEL,
  path: '/desktop/controls/',
  width: 460,
} as const

const getSurfaceApi = () => import('@winter-love/desktop-surface')

const closeControls = async (): Promise<void> => {
  const {closeControlSurface} = await getSurfaceApi()
  await closeControlSurface({label: CONTROL_LABEL})
}

const restoreNormalMode = async (): Promise<void> => {
  const {restoreSurface} = await getSurfaceApi()
  await restoreSurface({label: BACKGROUND_LABEL})
}

export const getDesktopBackgroundInteraction = async (): Promise<DesktopBackgroundInteraction> => {
  const {getBackgroundInteraction} = await getSurfaceApi()
  return getBackgroundInteraction({label: BACKGROUND_LABEL})
}

const enterDesktopMode = async (): Promise<void> => {
  const {openControlSurface, restoreSurface, setBackgroundSurface} = await getSurfaceApi()

  try {
    await setBackgroundSurface({interaction: 'interactive', label: BACKGROUND_LABEL})
    await openControlSurface(CONTROL_SURFACE_OPTIONS)
  } catch (error: unknown) {
    const cleanupResults = await Promise.allSettled([
      closeControls(),
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

export const setDesktopBackgroundInteraction = async (
  interaction: DesktopBackgroundInteraction,
): Promise<void> => {
  const {openControlSurface, setBackgroundInteraction} = await getSurfaceApi()
  await setBackgroundInteraction({interaction, label: BACKGROUND_LABEL})
  await openControlSurface(CONTROL_SURFACE_OPTIONS)
}

/** Releases the transient controller during a non-desktop mode transition. */
export const finishDesktopModeTransition = async (mode: DesktopMode): Promise<void> => {
  if (mode !== 'desktop') {
    await closeControls()
  }
}
