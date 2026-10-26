export interface DesktopWorkArea {
  readonly height: number
  readonly left: number
  readonly top: number
  readonly width: number
}

export interface DesktopControlSurfaceOptions {
  readonly height: number
  readonly label: 'desktop-player' | 'desktop-pomodoro' | 'desktop-settings'
  readonly path: string
  readonly width: number
  readonly x: number
  readonly y: number
}
