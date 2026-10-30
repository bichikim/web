import {clamp} from 'es-toolkit/math'
import type {DesktopControlSurfaceOptions, DesktopWorkArea} from './types'

const SURFACE_MARGIN = 24

const fitCoordinate = (start: number, length: number, size: number, preferred: number): number =>
  clamp(preferred, start, start + Math.max(0, length - size))

/** Keeps control sizes fixed and clamps their initial positions to a work-area snapshot. */
export const getControlSurfaceOptions = (
  workArea: DesktopWorkArea,
): ReadonlyArray<DesktopControlSurfaceOptions> => {
  const player = {height: 340, width: 520}
  const pomodoro = {height: 520, width: 360}
  const settings = {height: 620, width: 480}

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
