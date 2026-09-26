import {readPDisplayPreferences} from 'src/features/focus-room-display-preferences'
import {getBackgroundRepository} from 'src/features/background'

import {type DesktopMode, isDesktopBackgroundMode, readDesktopMode} from './model'

const BACKGROUND_LABEL = 'background'
const DESKTOP_WIDGET_CORNER_RADIUS = 20
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

const readWebsiteBackgroundUrl = async (): Promise<string | null> => {
  try {
    const {preferences} = await (await getBackgroundRepository()).read()
    return preferences.mode === 'website' ? preferences.websiteUrl : null
  } catch {
    return null
  }
}

export const shouldHandoffDesktopModeOwner = async (mode: DesktopMode): Promise<boolean> =>
  mode === 'desktop' && (await readWebsiteBackgroundUrl()) !== null

interface SynchronizeBackgroundContentOptions {
  readonly onApply?: () => void
  readonly restoreWhenMissing?: boolean
  readonly shouldApply?: () => boolean
  readonly url?: string | null
  readonly useChild?: boolean
}

interface BackgroundSynchronizationTarget {
  readonly mode: DesktopMode
  readonly url: string | null
}

interface PendingBackgroundSynchronization {
  readonly hasStarted: () => boolean
  readonly promise: Promise<void>
  readonly revision: number
  readonly target: BackgroundSynchronizationTarget
}

let backgroundSynchronizationRevision = 0
let backgroundSynchronizationRequest = 0
let lastBackgroundSynchronization: {
  readonly revision: number
  readonly target: BackgroundSynchronizationTarget
} | null = null
let pendingBackgroundSynchronization: PendingBackgroundSynchronization | null = null

const hasSameSynchronizationTarget = (
  left: BackgroundSynchronizationTarget,
  right: BackgroundSynchronizationTarget,
): boolean => left.mode === right.mode && left.url === right.url

const invalidateBackgroundSynchronization = (): void => {
  backgroundSynchronizationRevision += 1
  lastBackgroundSynchronization = null
}

const synchronizeBackgroundContent = async ({
  onApply,
  restoreWhenMissing = true,
  shouldApply = () => true,
  url: configuredUrl,
  useChild = false,
}: SynchronizeBackgroundContentOptions = {}): Promise<boolean> => {
  const {navigateBackgroundSurface, restoreBackgroundContent} = await getSurfaceApi()
  const url = configuredUrl === undefined ? await readWebsiteBackgroundUrl() : configuredUrl

  if (!shouldApply()) {
    return false
  }

  if (url === null) {
    if (restoreWhenMissing) {
      onApply?.()
      await restoreBackgroundContent({label: BACKGROUND_LABEL})
    }
    return false
  }

  onApply?.()
  await navigateBackgroundSurface({
    label: BACKGROUND_LABEL,
    url,
    ...(useChild ? {useChild: true} : {}),
  })
  return true
}

export type DesktopBackgroundPointerEventKind =
  | 'down'
  | 'up'
  | 'dragged'
  | 'moved'
  | 'left'
  | 'cancelled'

export type DesktopBackgroundMouseEventKind = DesktopBackgroundPointerEventKind | 'wheel'

export interface DesktopBackgroundMouseEvent {
  readonly altKey: boolean
  readonly button: number
  readonly buttons: number
  readonly clickCount: number
  readonly ctrlKey: boolean
  readonly kind: DesktopBackgroundMouseEventKind
  readonly metaKey: boolean
  readonly shiftKey: boolean
  readonly x: number
  readonly y: number
  readonly deltaMode?: number
  readonly deltaX?: number
  readonly deltaY?: number
  readonly deltaZ?: number
}

export const forwardDesktopBackgroundMouseEvent = async (
  event: DesktopBackgroundMouseEvent,
): Promise<void> => {
  if (import.meta.env.VITE_POMO_IS_DESKTOP !== 'true') {
    return
  }

  const {forwardBackgroundMouseEvent} = await getSurfaceApi()
  await forwardBackgroundMouseEvent({label: BACKGROUND_LABEL, ...event})
}

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

const enterDesktopMode = async (): Promise<boolean> => {
  const {openControlSurface, restoreBackgroundContent, restoreSurface, setBackgroundSurface} =
    await getSurfaceApi()

  const preferences = await readPDisplayPreferences()
  const visibility = {
    'desktop-player': preferences.playerVisible,
    'desktop-pomodoro': preferences.pomodoroVisible,
    'desktop-settings': true,
  }
  const surfaces = getControlSurfaceOptions().filter(({label}) => visibility[label])

  try {
    await restoreBackgroundContent({label: BACKGROUND_LABEL})
    await setBackgroundSurface({interaction: 'passThrough', label: BACKGROUND_LABEL})
    const usesWebsiteBackground = await synchronizeBackgroundContent({restoreWhenMissing: false})
    const results = await Promise.allSettled(surfaces.map((options) => openControlSurface(options)))
    const errors = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    )

    if (errors.length === 1) {
      throw errors[0]
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, 'One or more desktop control surfaces could not be opened')
    }

    return usesWebsiteBackground
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

export const applyDesktopMode = async (mode: DesktopMode): Promise<boolean> => {
  invalidateBackgroundSynchronization()

  switch (mode) {
    case 'desktop':
      return enterDesktopMode()
    case 'interactiveDesktop':
      const {restoreBackgroundContent, setBackgroundSurface} = await getSurfaceApi()
      await restoreBackgroundContent({label: BACKGROUND_LABEL})
      await setBackgroundSurface({interaction: 'interactive', label: BACKGROUND_LABEL})
      await synchronizeBackgroundContent({
        restoreWhenMissing: false,
        useChild: true,
      })
      return false
    case 'normal':
      await restoreNormalMode()
      return false
    case 'widget':
      const {restoreBackgroundContent: restoreWidgetBackgroundContent, setWidgetSurface} =
        await getSurfaceApi()
      await restoreWidgetBackgroundContent({label: BACKGROUND_LABEL})
      await setWidgetSurface({
        cornerRadius: DESKTOP_WIDGET_CORNER_RADIUS,
        height: 520,
        label: BACKGROUND_LABEL,
        width: 420,
      })
      await synchronizeBackgroundContent({restoreWhenMissing: false, useChild: true})
      return false
  }

  const exhaustiveMode: never = mode
  return exhaustiveMode
}

export const synchronizeDesktopBackground = async (): Promise<void> => {
  if (import.meta.env.VITE_POMO_IS_DESKTOP !== 'true') {
    return
  }

  const revision = backgroundSynchronizationRevision
  backgroundSynchronizationRequest += 1
  const request = backgroundSynchronizationRequest
  const shouldApply = () =>
    backgroundSynchronizationRevision === revision && backgroundSynchronizationRequest === request
  const mode = readDesktopMode()
  const usesWebsiteChild = mode === 'normal' || mode === 'interactiveDesktop' || mode === 'widget'
  if (mode !== 'desktop' && !usesWebsiteChild && !isDesktopBackgroundMode(mode)) {
    return
  }

  const target = {mode, url: await readWebsiteBackgroundUrl()}
  if (!shouldApply()) {
    return
  }

  const pending = pendingBackgroundSynchronization
  const hasPendingDifferentTarget =
    pending !== null &&
    pending.revision === revision &&
    !hasSameSynchronizationTarget(pending.target, target)
  if (
    lastBackgroundSynchronization?.revision === revision &&
    hasSameSynchronizationTarget(lastBackgroundSynchronization.target, target) &&
    !hasPendingDifferentTarget
  ) {
    return
  }

  if (
    pending !== null &&
    pending.revision === revision &&
    hasSameSynchronizationTarget(pending.target, target)
  ) {
    if (pending.hasStarted()) {
      await pending.promise
      if (shouldApply()) {
        lastBackgroundSynchronization = {revision, target}
      }
      return
    }
  }

  let hasStarted = false
  const operation = synchronizeBackgroundContent({
    onApply: () => {
      hasStarted = true
    },
    shouldApply,
    url: target.url,
    useChild: usesWebsiteChild,
  })
  const promise = operation.then(() => {
    if (shouldApply()) {
      lastBackgroundSynchronization = {revision, target}
    }
  })
  const synchronization: PendingBackgroundSynchronization = {
    hasStarted: () => hasStarted,
    promise,
    revision,
    target,
  }
  pendingBackgroundSynchronization = synchronization

  try {
    await promise
  } finally {
    if (pendingBackgroundSynchronization === synchronization) {
      pendingBackgroundSynchronization = null
    }
  }
}

/** Persists content-owned state by closing player and timer surfaces before mode publication. */
export const prepareDesktopModeTransition = async (mode: DesktopMode): Promise<void> => {
  if (mode !== 'desktop') {
    await closeSurfaces(CONTENT_SURFACE_LABELS)
  }
}

/** Releases the mode controller after all windows have observed the new mode. */
export const finishDesktopModeTransition = async (mode: DesktopMode): Promise<void> => {
  if (mode === 'desktop') {
    return
  }

  await closeSurfaces([SETTINGS_SURFACE_LABEL])
}
