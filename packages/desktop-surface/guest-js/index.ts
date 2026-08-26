import {invoke} from '@tauri-apps/api/core'

const COMMAND_PREFIX = 'plugin:desktop-surface|'

export interface SurfaceTarget {
  readonly label: string
}

export type BackgroundInteraction = 'interactive' | 'passThrough'

export interface BackgroundInteractionOptions extends SurfaceTarget {
  readonly interaction: BackgroundInteraction
}

export interface BackgroundSurfaceOptions extends SurfaceTarget {
  readonly interaction?: BackgroundInteraction
}

export interface OpenControlSurfaceOptions extends SurfaceTarget {
  readonly height?: number
  readonly path: string
  readonly width?: number
  readonly x?: number
  readonly y?: number
}

export interface ControlSurfaceStatus {
  readonly created: boolean
}

export interface WidgetSurfaceOptions extends SurfaceTarget {
  readonly height?: number
  readonly width?: number
}

export const setBackgroundSurface = (options: BackgroundSurfaceOptions): Promise<void> =>
  invoke(`${COMMAND_PREFIX}set_background_surface`, {options})

export const getBackgroundInteraction = (target: SurfaceTarget): Promise<BackgroundInteraction> =>
  invoke(`${COMMAND_PREFIX}get_background_interaction`, {label: target.label})

export const setBackgroundInteraction = (options: BackgroundInteractionOptions): Promise<void> =>
  invoke(`${COMMAND_PREFIX}set_background_interaction`, {options})

export const restoreSurface = (target: SurfaceTarget): Promise<void> =>
  invoke(`${COMMAND_PREFIX}restore_surface`, {label: target.label})

export const setWidgetSurface = (options: WidgetSurfaceOptions): Promise<void> =>
  invoke(`${COMMAND_PREFIX}set_widget_surface`, {options})

export const openControlSurface = (
  options: OpenControlSurfaceOptions,
): Promise<ControlSurfaceStatus> => invoke(`${COMMAND_PREFIX}open_control_surface`, {options})

export const closeControlSurface = (target: SurfaceTarget): Promise<void> =>
  invoke(`${COMMAND_PREFIX}close_control_surface`, {label: target.label})
